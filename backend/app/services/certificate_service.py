from sqlalchemy.orm import Session
from fastapi import HTTPException, status

from app.models.audit_log import AuditLog
from app.models.certificate_request import CertificateRequest, RequestStatus
from app.models.signature import Signature
import os
from datetime import datetime

from app.engine.certificate_engine import CertificateEngine
from app.engine.certificate_dependency_engine import CertificateDependencyEngine


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

    def _format_student_name(student) -> str:
        if not student:
            return ""
        parts = [student.first_name, student.middle_name, student.last_name]
        return " ".join([p for p in parts if p]).strip()

    def _ordinal(n: int) -> str:
        if 10 <= (n % 100) <= 20:
            suffix = "th"
        else:
            suffix = {1: "st", 2: "nd", 3: "rd"}.get(n % 10, "th")
        return f"{n}{suffix}"

    resolved_key, dependencies = CertificateDependencyEngine.resolve_with_type_key(
        db=db,
        certificate_type=request.certificate_type_name,
        student_id=request.sr_code,
        request_id=request_id,
    )

    student = dependencies.get("student")
    program = dependencies.get("program")
    college = dependencies.get("college")
    campus = dependencies.get("campus")
    enrollment = dependencies.get("enrollment")
    graduation_record = dependencies.get("graduation_record")

    default_signature = (
        db.query(Signature)
        .filter(Signature.is_active == True)
        .order_by(Signature.is_default.desc(), Signature.created_at.desc())
        .first()
    )

    now = datetime.now()
    day_text = str(now.day)
    month_text = now.strftime("%B")

    student_name = _format_student_name(student) or request.student_name
    program_name = (program.name if program else None) or request.program
    college_name = (college.name if college else None) or ""
    campus_name = (campus.name if campus else None) or ""
    campus_address = (campus.campus_address if campus else None) or ""
    campus_telNo = (campus.campus_telNo if campus else None) or ""
    campus_email = (campus.campus_email if campus else None) or ""
    campus_certCode = (campus.campus_certCode if campus else None) or ""

    year_level = ""
    current_semester = ""
    academic_year = ""
    if enrollment:
        if enrollment.year_level is not None:
            try:
                year_level = _ordinal(int(enrollment.year_level))
            except (TypeError, ValueError):
                year_level = str(enrollment.year_level)
        current_semester = str(enrollment.semester or "")
        academic_year = str(enrollment.academic_year or "")

    date_of_graduation = ""
    if graduation_record and getattr(graduation_record, "date_of_graduation", None):
        date_val = graduation_record.date_of_graduation
        if hasattr(date_val, "strftime"):
            date_of_graduation = date_val.strftime("%B %d, %Y")
        else:
            date_of_graduation = str(date_val)

    data = {
        "student_name": student_name,
        "sr_code": student.sr_code if student else request.sr_code,
        "program": program_name,
        "major": (student.major if student else None) or request.major,
        "year_graduated": request.year_graduated or (date_of_graduation[-4:] if date_of_graduation else ""),
        "reference_number": request.reference_number,
        "or_number": getattr(request, "or_number", "") or "",
        "purpose": request.purpose,
        "verification_code": request.verification_token,
        "requestor_name": request.requestor_name,
        "requestor_relationship": request.requestor_relationship,
        "requestor_address": request.requestor_address,
        "requestor_contact": request.requestor_contact,
        "requestor_email": request.requestor_email,
        "certificate_type": resolved_key,
        "name_official": default_signature.name if default_signature else "",
        "official_title": default_signature.title if default_signature else "",
        "campus_name": campus_name,
        "campus_address": campus_address,
        "campus_telNo": campus_telNo,
        "campus_email": campus_email,
        "campus_certCode": campus_certCode,
        "student_year": year_level,
        "course_name": program_name,
        "college_name": college_name,
        "current_sem": current_semester,
        "academic_year": academic_year,
        "requestor_name": request.requestor_name,
        "date_issued_day": day_text,
        "date_issued_month": month_text,
        "request_purpose": request.purpose,
    }

    try:
        pdf_bytes = CertificateEngine.generate(resolved_key, data)
        output_dir = "uploads/certificates"
        os.makedirs(output_dir, exist_ok=True)
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        filename = f"{request.reference_number}_{timestamp}.pdf"
        pdf_path = os.path.join(output_dir, filename)
        with open(pdf_path, "wb") as file:
            file.write(pdf_bytes)
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
