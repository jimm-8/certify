from fastapi import APIRouter, Depends, HTTPException, status, File, UploadFile
from app.services.email_service import EmailService
from sqlalchemy.orm import Session
from typing import Optional
import random
from datetime import datetime
import base64
import os
import glob

from app.database import get_db
from app.models.certificate_request import CertificateRequest, CertificateType, RequestStatus
from app.schemas.certificate_request import (
    CertificateRequestCreate,
    CertificateRequestResponse,
    CertificateRequestTrackResponse,
    CertificateRequestDetail
)

from app.services.request_service import (
    update_request_status,
    update_student_data,
    add_note_to_request
)
from app.models.audit_log import AuditLog
from app.models.certificate_request import RequestNote
from app.schemas.certificate_request import StatusUpdateRequest, StudentDataUpdate
from app.schemas.audit import AuditLogResponse, RequestNoteCreate, RequestNoteResponse

from app.schemas.certificate_request import CertificateVerificationResponse

from app.services.certificate_service import generate_certificate_pdf
from fastapi.responses import FileResponse

# Create router
router = APIRouter(prefix="/requests", tags=["Certificate Requests"])

# Helper function to generate reference number
def generate_reference_number(db: Session) -> str:
    """Generate unique reference number in format: REF-YYYYMMDD-XXXX"""
    today = datetime.now().strftime("%Y%m%d")
    
    # Count requests today to get the next number
    count = db.query(CertificateRequest).filter(
        CertificateRequest.reference_number.like(f"REF-{today}-%")
    ).count()
    
    next_num = count + 1
    return f"REF-{today}-{next_num:04d}"  # Format: REF-20241222-0001

# Helper function to generate PIN
def generate_pin() -> str:
    """Generate random 4-digit PIN"""
    return str(random.randint(1000, 9999))

# Helper function to save signature
def save_signature(signature_data: str, reference_number: str) -> str:
    """Save base64 signature image and return file path"""
    if not signature_data:
        return None
    
    try:
        # Create uploads/signatures directory if it doesn't exist
        upload_dir = "uploads/signatures"
        os.makedirs(upload_dir, exist_ok=True)
        
        # Remove data:image/png;base64, prefix if present
        if "," in signature_data:
            signature_data = signature_data.split(",")[1]
        
        # Decode base64
        image_data = base64.b64decode(signature_data)
        
        # Save file
        filename = f"{reference_number}.png"
        filepath = os.path.join(upload_dir, filename)
        
        with open(filepath, "wb") as f:
            f.write(image_data)
        
        return filepath
    except Exception as e:
        print(f"Error saving signature: {e}")
        return None

# Endpoint 1: Create certificate request
@router.post("/", response_model=CertificateRequestResponse, status_code=status.HTTP_201_CREATED)
async def create_certificate_request(
    request_data: CertificateRequestCreate,
    db: Session = Depends(get_db)
):
    """
    Submit a new certificate request with signature
    """
    
    # Verify certificate type exists
    cert_type = db.query(CertificateType).filter(
        CertificateType.id == request_data.certificate_type_id,
        CertificateType.is_active == 1
    ).first()
    
    if not cert_type:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Certificate type not found or inactive"
        )
    
    # Generate reference number and PIN
    reference_number = generate_reference_number(db)
    pin = generate_pin()
    
    # Save signature if provided
    signature_path = None
    if request_data.signature_data:
        signature_path = save_signature(request_data.signature_data, reference_number)
    
    # Create new request
    new_request = CertificateRequest(
        reference_number=reference_number,
        pin=pin,
        certificate_type_id=cert_type.id,
        certificate_type_name=cert_type.name,
        requestor_name=request_data.requestor_name,
        requestor_address=request_data.requestor_address,
        requestor_relationship=request_data.requestor_relationship,
        requestor_contact=request_data.requestor_contact,
        requestor_email=request_data.requestor_email,
        purpose=request_data.purpose,
        sr_code=request_data.sr_code,
        student_name=request_data.student_name,
        program=request_data.program,
        major=request_data.major,
        year_graduated=request_data.year_graduated,
        signature_path=signature_path,
        verification_token=None,
        status=RequestStatus.PENDING
    )
    
    # Save to database
    db.add(new_request)
    db.commit()
    db.refresh(new_request)
    
    # Send confirmation email
    try:
        email_service = EmailService()
        await email_service.send_request_confirmation(
            to_email=request_data.requestor_email,
            reference_number=reference_number,
            pin=pin,
            requestor_name=request_data.requestor_name, 
            student_name=request_data.student_name, 
            certificate_type=cert_type.name,
            submitted_date=new_request.created_at
        )
        print(f"✅ Email sent to {request_data.requestor_email}")
    except Exception as e:
        print(f"⚠️ Email failed but request was created: {e}")
        # Don't fail the request if email fails
    
    return CertificateRequestResponse(
        reference_number=reference_number,
        pin=pin,
        message="Certificate request submitted successfully! Check your email for tracking details.",
        submitted_date=new_request.created_at
    )

# Endpoint 2: Track request by reference number and PIN
@router.get("/track", response_model=CertificateRequestTrackResponse)
def track_certificate_request(
    reference_number: str,
    pin: str,
    db: Session = Depends(get_db)
):
    """
    Track certificate request status
    
    Use your reference number and PIN to check the status of your request.
    """
    
    # Find request
    request = db.query(CertificateRequest).filter(
        CertificateRequest.reference_number == reference_number,
        CertificateRequest.pin == pin
    ).first()
    
    if not request:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Request not found. Please check your reference number and PIN."
        )
    
    return CertificateRequestTrackResponse(
        reference_number=request.reference_number,
        status=request.status,
        certificate_type=request.certificate_type_name,
        student_name=request.student_name,
        submitted_date=request.created_at,
        updated_date=request.updated_at
    )

# Endpoint 3: Get all requests
@router.get("/", response_model=list[CertificateRequestDetail])
def get_all_requests(
    skip: int = 0,
    limit: int = 10,
    status_filter: Optional[str] = None,
    db: Session = Depends(get_db)
):
    query = db.query(CertificateRequest)

    if status_filter:
        try:
            status_enum = RequestStatus[status_filter.upper()]  # convert string → enum
            query = query.filter(CertificateRequest.status == status_enum)
        except KeyError:
            raise HTTPException(
                status_code=400,
                detail=f"Invalid status '{status_filter}'. Valid values: {[s.name for s in RequestStatus]}"
            )

    requests = query.order_by(CertificateRequest.created_at.desc()).offset(skip).limit(limit).all()
    return requests

# Endpoint 4: Get single request details
@router.get("/{request_id}", response_model=CertificateRequestDetail)
def get_request_detail(
    request_id: int,
    db: Session = Depends(get_db)
):
    """
    Get detailed information about a specific request
    """
    
    request = db.query(CertificateRequest).filter(CertificateRequest.id == request_id).first()
    
    if not request:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Request not found"
        )
    
    return request

# Endpoint 5: Update request status
@router.patch("/{request_id}/status", response_model=CertificateRequestDetail)
def update_status(
    request_id: int,
    status_update: StatusUpdateRequest,
    db: Session = Depends(get_db)
):
    """
    Update the status of a certificate request
    
    Registrar can change request status following the workflow rules.
    Automatically creates audit logs.
    """
    
    updated_request = update_request_status(
        db=db,
        request_id=request_id,
        new_status=status_update.new_status,
        user_name=status_update.user_name,
        notes=status_update.notes,
        rejection_reason=status_update.rejection_reason,
        rejection_notes=status_update.rejection_notes
    )
    
    return updated_request

# Endpoint 6: Update student data on request
@router.patch("/{request_id}/student-data", response_model=CertificateRequestDetail)
def update_request_student_data(
    request_id: int,
    data_update: StudentDataUpdate,
    db: Session = Depends(get_db)
):
    """
    Update student information on a request
    
    Used when student data is missing or incorrect.
    Creates audit logs for all changes.
    """
    
    # Prepare updates dictionary (only include non-None values)
    updates = {}
    if data_update.sr_code is not None:
        updates['sr_code'] = data_update.sr_code
    if data_update.student_name is not None:
        updates['student_name'] = data_update.student_name
    if data_update.program is not None:
        updates['program'] = data_update.program
    if data_update.major is not None:
        updates['major'] = data_update.major
    if data_update.year_graduated is not None:
        updates['year_graduated'] = data_update.year_graduated
    
    updated_request = update_student_data(
        db=db,
        request_id=request_id,
        updates=updates,
        user_name=data_update.user_name,
        notes=data_update.notes
    )
    
    return updated_request

# Endpoint 7: Add note to request
@router.post("/{request_id}/notes", response_model=RequestNoteResponse, status_code=status.HTTP_201_CREATED)
def create_note(
    request_id: int,
    note_data: RequestNoteCreate,
    db: Session = Depends(get_db)
):
    """
    Add a note/comment to a request
    
    Registrar can add notes for communication or documentation.
    """
    
    note = add_note_to_request(
        db=db,
        request_id=request_id,
        note_text=note_data.note,
        note_type=note_data.note_type,
        user_name=note_data.user_name
    )
    
    return note

# Endpoint 8: Get all notes for a request
@router.get("/{request_id}/notes", response_model=list[RequestNoteResponse])
def get_request_notes(
    request_id: int,
    db: Session = Depends(get_db)
):
    """
    Get all notes/comments for a request
    """
    
    notes = db.query(RequestNote).filter(
        RequestNote.request_id == request_id
    ).order_by(RequestNote.created_at.desc()).all()
    
    return notes

# Endpoint 9: Get audit logs for a request
@router.get("/{request_id}/audit-logs", response_model=list[AuditLogResponse])
def get_request_audit_logs(
    request_id: int,
    db: Session = Depends(get_db)
):
    """
    Get complete audit trail for a request
    
    Shows all changes made to the request (status changes, data updates, etc.)
    """
    
    logs = db.query(AuditLog).filter(
        AuditLog.request_id == request_id
    ).order_by(AuditLog.created_at.desc()).all()
    
    return logs

# Endpoint 10: Get all audit logs (for admin/registrar)
@router.get("/audit-logs/all", response_model=list[AuditLogResponse])
def get_all_audit_logs(
    skip: int = 0,
    limit: int = 50,
    db: Session = Depends(get_db)
):
    """
    Get all audit logs across all requests
    
    For transparency and oversight.
    """
    
    logs = db.query(AuditLog).order_by(
        AuditLog.created_at.desc()
    ).offset(skip).limit(limit).all()
    
    return logs

# Endpoint 11: Verify certificate by token (public endpoint for QR code)
@router.get("/verify/{verification_token}", response_model=CertificateVerificationResponse)
def verify_certificate(
    verification_token: str,
    db: Session = Depends(get_db)
):
    """
    Verify certificate authenticity using QR code token
    
    This is a PUBLIC endpoint - anyone can verify if a certificate is real.
    Used for fraud prevention.
    """
    
    if not verification_token or verification_token == "null":
        return CertificateVerificationResponse(
            is_valid=False,
            message="Invalid verification code format."
        )
    
    
    request = db.query(CertificateRequest).filter(
        CertificateRequest.verification_token == verification_token
    ).first()
    
    if not request:
        return CertificateVerificationResponse(
            is_valid=False,
            message="Invalid verification code. This certificate could not be verified."
        )
    
    # Check if certificate is in valid state
    if request.status not in [RequestStatus.FOR_RELEASING, RequestStatus.COMPLETED]:
        return CertificateVerificationResponse(
            is_valid=False,
            message="This certificate is not yet released or has been revoked."
        )
    
    return CertificateVerificationResponse(
        is_valid=True,
        message="✓ Certificate is authentic and valid",
        certificate_type=request.certificate_type_name,
        student_name=request.student_name,
        issue_date=request.updated_at or request.created_at,
        status=request.status.value
    )

# Endpoint 12: Mark as completed (when QR is scanned at release)
@router.post("/{request_id}/complete", response_model=CertificateRequestDetail)
def mark_as_completed(
    request_id: int,
    user_name: str = "Registrar",
    db: Session = Depends(get_db)
):
    """
    Mark certificate as completed
    
    Called when QR code is scanned during certificate release,
    or manually marked by registrar.
    """
    
    updated_request = update_request_status(
        db=db,
        request_id=request_id,
        new_status=RequestStatus.COMPLETED,
        user_name=user_name,
        notes="Certificate released to student"
    )
    
    return updated_request

# Endpoint 13: Generate certificate PDF
@router.post("/{request_id}/generate-certificate")
def generate_certificate(
    request_id: int,
    user_name: str = "System",
    db: Session = Depends(get_db)
):
    """
    Generate PDF certificate for a request
    
    This endpoint:
    1. Validates request is in correct status
    2. Generates PDF with student data
    3. Returns file path
    """
    
    pdf_path = generate_certificate_pdf(
        db=db,
        request_id=request_id,
        user_name=user_name
    )
    
    return {
        "message": "Certificate generated successfully",
        "pdf_path": pdf_path,
        "filename": os.path.basename(pdf_path)
    }

# Endpoint 14: Download certificate PDF
@router.get("/{request_id}/download-certificate")
def download_certificate(
    request_id: int,
    db: Session = Depends(get_db)
):
    """
    Download the generated certificate PDF
    
    Returns the PDF file for download
    """
    
    request = db.query(CertificateRequest).filter(
        CertificateRequest.id == request_id
    ).first()
    
    if not request:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Request not found"
        )
    
    # For now, construct path from reference number
    # Later we'll use the pdf_path field from database
    pdf_dir = "uploads/certificates"
    
    # Find the PDF file
    import glob
    pattern = os.path.join(pdf_dir, f"{request.reference_number}_*.pdf")
    files = glob.glob(pattern)
    
    if not files:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Certificate PDF not found. Please generate it first."
        )
    
    pdf_path = files[0]  # Get the first matching file
    
    if not os.path.exists(pdf_path):
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Certificate PDF file not found"
        )
    
    # Return file for download
    return FileResponse(
        path=pdf_path,
        media_type='application/pdf',
        filename=f"Certificate_{request.student_name}_{request.reference_number}.pdf"
    )