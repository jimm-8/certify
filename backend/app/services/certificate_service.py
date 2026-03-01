from sqlalchemy.orm import Session
from fastapi import HTTPException, status
from typing import Optional
import os

from app.models.certificate_request import CertificateRequest, RequestStatus
from app.models.audit_log import AuditLog
from app.utils.pdf_generator import CertificateGenerator

def generate_certificate_pdf(
    db: Session,
    request_id: int,
    user_name: str = "System"
) -> str:
    """
    Generate PDF certificate for a request
    
    This function:
    1. Retrieves request data
    2. Generates PDF certificate
    3. Saves PDF file path to database
    4. Creates audit log
    
    Returns: Path to generated PDF file
    """
    
    # Get request
    request = db.query(CertificateRequest).filter(
        CertificateRequest.id == request_id
    ).first()
    
    if not request:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Request not found"
        )
    
    if not request.verification_token:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot generate certificate: Request must be approved first to have a verification token"
        )
    
    # Check if request is in correct status
    if request.status not in [RequestStatus.PROCESSING]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Cannot generate certificate for request in {request.status.value} status"
        )
    
    # Prepare certificate data
    certificate_data = {
        'student_name': request.student_name,
        'sr_code': request.sr_code,
        'program': request.program,
        'major': request.major,
        'year_graduated': request.year_graduated,
        'certificate_type': request.certificate_type_name,
        'reference_number': request.reference_number,
        'purpose': request.purpose,
        'verification_token': request.verification_token,
    }
    
    # Get active signatures
    from app.models.signature import Signature
    signatures = db.query(Signature).filter(
        Signature.is_active == True
    ).order_by(Signature.position).all()
    
    # Format signatures for PDF
    certificate_data['signatures'] = [
        {
            'name': sig.name,
            'title': sig.title,
            'position': sig.position,
            'file_path': sig.file_path
        }
        for sig in signatures
    ]
    
    # Generate PDF
    generator = CertificateGenerator()
    
    try:
        pdf_path = generator.generate_certificate(certificate_data)
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to generate certificate: {str(e)}"
        )
    
    # Save PDF path to request (we need to add this field to the model)
    # For now, we'll just return the path
    
    # Create audit log
    audit_log = AuditLog(
        request_id=request_id,
        action="CERTIFICATE_GENERATED",
        field_name="pdf_path",
        new_value=pdf_path,
        user_name=user_name,
        notes="Certificate PDF generated successfully"
    )
    db.add(audit_log)
    db.commit()
    
    return pdf_path

def get_certificate_data_from_student_db(
    db: Session,
    sr_code: str
) -> dict:
    """
    Fetch student data from mock database and prepare for certificate
    
    This simulates pulling data from the school's student database API
    """
    from app.models.student import Student
    
    student = db.query(Student).filter(Student.sr_code == sr_code).first()
    
    if not student:
        return None
    
    # Format full name
    full_name = f"{student.first_name}"
    if student.middle_name:
        full_name += f" {student.middle_name}"
    full_name += f" {student.last_name}"
    
    return {
        'student_name': full_name,
        'program': student.program,
        'major': student.major,
        'sr_code': student.sr_code,
        'email': student.email,
        'contact_number': student.contact_number
    }