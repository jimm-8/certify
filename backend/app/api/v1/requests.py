from fastapi import APIRouter, Depends, HTTPException, status
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
from app.models.student import Student
from app.models.program import Program
from app.repositories import (
    AuditLogRepository,
    CertificateRequestRepository,
    CertificateTypeRepository,
    ProgramRepository,
    StudentRepository,
)
from app.schemas.certificate_request import (
    CertificateRequestCreate,
    CertificateRequestResponse,
    CertificateRequestTrackResponse,
    CertificateRequestDetail
)

from app.services.request_service import (
    update_request_status,
    update_student_data,
    add_note_to_request,
    generate_verification_token,
)
from app.models.audit_log import AuditLog
from app.schemas.certificate_request import StatusUpdateRequest, StudentDataUpdate
from app.schemas.audit import AuditLogResponse, RequestNoteCreate

from app.schemas.certificate_request import CertificateVerificationResponse

from app.services.certificate_service import generate_certificate_pdf
from app.api.v1.auth import require_permissions
from fastapi.responses import FileResponse

# Create router
router = APIRouter(prefix="/requests", tags=["Certificate Requests"])

# Helper function to generate reference number
def generate_reference_number(db: Session) -> str:
    """Generate unique reference number in format: YY-MMDD-#####"""
    now = datetime.now()
    year = now.strftime("%y")
    month_day = now.strftime("%m%d")

    request_repo = CertificateRequestRepository(db)
    while True:
        random_suffix = f"{random.randint(0, 99999):05d}"
        ref = f"{year}-{month_day}-{random_suffix}"
        exists = request_repo.query().filter(
            CertificateRequest.reference_number == ref
        ).first()
        if not exists:
            return ref

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
    cert_type_repo = CertificateTypeRepository(db)
    cert_type = cert_type_repo.get_active_by_id(request_data.certificate_type_id)
    
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
        signature_data=request_data.signature_data,
        request_cost=request_data.request_cost,
        verification_token=generate_verification_token(),
        status=RequestStatus.APPROVED
    )
    
    # Save to database
    request_repo = CertificateRequestRepository(db)
    request_repo.add(new_request)
    db.commit()
    db.refresh(new_request)
    
    # Send confirmation email
    try:
        campus_email = None
        campus_telNo = None

        student_repo = StudentRepository(db)
        program_repo = ProgramRepository(db)
        if request_data.sr_code:
            student = student_repo.get_by_sr_code(request_data.sr_code)
        else:
            student = None

        campus = None
        if student is not None:
            campus = student.campus or (student.program.campus if student.program else None)
        if campus is None and request_data.program:
            program = program_repo.get_by_name(request_data.program)
            campus = program.campus if program else None

        if campus is not None:
            campus_email = campus.campus_email
            campus_telNo = campus.campus_telNo

        email_service = EmailService()
        await email_service.send_request_confirmation(
            to_email=request_data.requestor_email,
            reference_number=reference_number,
            pin=pin,
            requestor_name=request_data.requestor_name, 
            student_name=request_data.student_name, 
            certificate_type=cert_type.name,
            submitted_date=new_request.created_at,
            request_cost=request_data.request_cost,
            campus_email=campus_email,
            campus_telNo=campus_telNo
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
    request_repo = CertificateRequestRepository(db)
    request = request_repo.get_by_reference_and_pin(reference_number, pin)
    
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
    db: Session = Depends(get_db),
    _: dict = Depends(require_permissions("requests.read")),
):
    request_repo = CertificateRequestRepository(db)
    query = request_repo.query()

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
    db: Session = Depends(get_db),
    _: dict = Depends(require_permissions("requests.read")),
):
    """
    Get detailed information about a specific request
    """
    
    request_repo = CertificateRequestRepository(db)
    request = request_repo.get_by_id(request_id)
    
    if not request:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Request not found"
        )
    
    return request

# Endpoint 5: Update request status
@router.patch("/{request_id}/status", response_model=CertificateRequestDetail)
async def update_status(                         
    request_id: int,
    status_update: StatusUpdateRequest,
    db: Session = Depends(get_db),
    _: dict = Depends(require_permissions("requests.update_status")),
):
    # Convert schema enum to model enum to satisfy transition checks
    new_status = RequestStatus(status_update.new_status.value)
    updated_request = await update_request_status(  
        db=db,
        request_id=request_id,
        new_status=new_status,
        user_name=status_update.user_name,
        notes=status_update.notes
    )
    return updated_request

# Endpoint 6: Update student data on request
@router.patch("/{request_id}/student-data", response_model=CertificateRequestDetail)
def update_request_student_data(
    request_id: int,
    data_update: StudentDataUpdate,
    db: Session = Depends(get_db),
    _: dict = Depends(require_permissions("requests.update_data")),
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
@router.post("/{request_id}/notes", response_model=AuditLogResponse, status_code=status.HTTP_201_CREATED)
def create_note(
    request_id: int,
    note_data: RequestNoteCreate,
    db: Session = Depends(get_db),
    _: dict = Depends(require_permissions("requests.notes")),
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
@router.get("/{request_id}/notes", response_model=list[AuditLogResponse])
def get_request_notes(
    request_id: int,
    db: Session = Depends(get_db),
    _: dict = Depends(require_permissions("requests.read")),
):
    """
    Get all notes/comments for a request
    """
    
    audit_repo = AuditLogRepository(db)
    notes = audit_repo.request_notes(request_id).all()
    
    return notes

# Endpoint 9: Get audit logs for a request
@router.get("/{request_id}/audit-logs", response_model=list[AuditLogResponse])
def get_request_audit_logs(
    request_id: int,
    db: Session = Depends(get_db),
    _: dict = Depends(require_permissions("requests.read")),
):
    """
    Get complete audit trail for a request
    
    Shows all changes made to the request (status changes, data updates, etc.)
    """
    
    audit_repo = AuditLogRepository(db)
    logs = audit_repo.for_request(request_id).all()
    
    return logs

# Endpoint 10: Get all audit logs (for admin/registrar)
@router.get("/audit-logs/all", response_model=list[AuditLogResponse])
def get_all_audit_logs(
    skip: int = 0,
    limit: int = 50,
    db: Session = Depends(get_db),
    _: dict = Depends(require_permissions("requests.read")),
):
    """
    Get all audit logs across all requests
    
    For transparency and oversight.
    """
    
    audit_repo = AuditLogRepository(db)
    logs = audit_repo.query().order_by(
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
    
    
    request_repo = CertificateRequestRepository(db)
    request = request_repo.query().filter(
        CertificateRequest.verification_token == verification_token
    ).first()
    
    if not request:
        return CertificateVerificationResponse(
            is_valid=False,
            message="Invalid verification code. This certificate could not be verified."
        )
    
    # Check if certificate is in valid state
    if request.status not in [RequestStatus.FOR_RELEASING, RequestStatus.RELEASED]:
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

# Endpoint 12: Mark as released (when QR is scanned at release)
@router.post("/{request_id}/release", response_model=CertificateRequestDetail)
async def mark_as_released(
    request_id: int,
    user_name: str = "Registrar",
    db: Session = Depends(get_db),
    _: dict = Depends(require_permissions("certificates.release")),
):
    updated_request = await update_request_status(  
        db=db,
        request_id=request_id,
        new_status=RequestStatus.RELEASED,
        user_name=user_name,
        notes="Certificate released to student"
    )
    return updated_request

# Endpoint 13: Generate certificate PDF
@router.post("/{request_id}/generate-certificate")
def generate_certificate(
    request_id: int,
    user_name: str = "System",
    db: Session = Depends(get_db),
    _: dict = Depends(require_permissions("certificates.generate")),
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
    db: Session = Depends(get_db),
    _: dict = Depends(require_permissions("certificates.generate")),
):
    """
    Download the generated certificate PDF
    
    Returns the PDF file for download
    """
    
    request_repo = CertificateRequestRepository(db)
    request = request_repo.get_by_id(request_id)
    
    if not request:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Request not found"
        )
    
    pdf_path = request.pdf_path
    if not pdf_path:
        pdf_dir = "uploads/certificates"
        pattern = os.path.join(pdf_dir, f"{request.reference_number}_*.pdf")
        files = glob.glob(pattern)

        if not files:
            # Attempt on-demand generation when missing
            try:
                pdf_path = generate_certificate_pdf(db=db, request_id=request_id, user_name="System")
            except HTTPException:
                raise
            except Exception:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="Certificate PDF not found. Please generate it first."
                )

        files.sort(key=os.path.getmtime, reverse=True)
        pdf_path = pdf_path or files[0]

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
