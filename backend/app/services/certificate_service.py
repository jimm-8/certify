from sqlalchemy.orm import Session
from fastapi import HTTPException, status

from app.models.audit_log import AuditLog
from app.models.certificate_request import CertificateRequest, RequestStatus
from app.services.template_service import CertificateTemplateService


def generate_certificate_pdf(
    db: Session,
    request_id: int,
    user_name: str = "System"
) -> str:
    """
    Generate PDF certificate for a request.

    Flow:
    1. Load request
    2. Validate status and verification token
    3. Resolve + render certificate template
    4. Generate PDF and audit the operation
    """

    request = db.query(CertificateRequest).filter(CertificateRequest.id == request_id).first()

    if not request:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Request not found")

    if not request.verification_token:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot generate certificate: Request must be approved first to have a verification token",
        )

    if request.status not in [RequestStatus.PROCESSING]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Cannot generate certificate for request in {request.status.value} status",
        )

    from app.models.signature import Signature

    signatures = db.query(Signature).filter(Signature.is_active == True).order_by(Signature.position).all()
    signature_payload = [
        {
            "name": sig.name,
            "title": sig.title,
            "position": sig.position,
            "file_path": sig.file_path,
        }
        for sig in signatures
    ]

    template_service = CertificateTemplateService()

    try:
        pdf_path = template_service.generate_for_request(request, signature_payload)
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to generate certificate: {str(exc)}",
        )

    request.pdf_path = pdf_path

    audit_log = AuditLog(
        request_id=request_id,
        action="CERTIFICATE_GENERATED",
        field_name="pdf_path",
        new_value=pdf_path,
        user_name=user_name,
        notes="Certificate PDF generated from mapped template successfully",
    )
    db.add(audit_log)
    db.commit()
    db.refresh(request)

    return pdf_path


def get_certificate_data_from_student_db(
    db: Session,
    sr_code: str
) -> dict:
    """
    Fetch student data from mock database and prepare for certificate.
    """
    from app.models.student import Student

    student = db.query(Student).filter(Student.sr_code == sr_code).first()

    if not student:
        return None

    full_name = f"{student.first_name}"
    if student.middle_name:
        full_name += f" {student.middle_name}"
    full_name += f" {student.last_name}"

    return {
        "student_name": full_name,
        "program": student.program,
        "major": student.major,
        "sr_code": student.sr_code,
        "email": student.email,
        "contact_number": student.contact_number,
    }
