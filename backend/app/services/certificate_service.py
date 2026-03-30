from sqlalchemy.orm import Session
from fastapi import HTTPException, status

from app.models.audit_log import AuditLog
from app.models.certificate_request import CertificateRequest, RequestStatus
from app.models.authorized_official import AuthorizedOfficial
import os
from datetime import datetime

from app.engine.certificate_engine import CertificateEngine
from app.engine.certificate_dependency_engine import CertificateDependencyEngine
from app.models.student_address import StudentAddress
from app.repositories import (
    AuditLogRepository,
    AuthorizedOfficialRepository,
    CertificateRequestRepository,
    StudentAddressRepository,
    StudentRepository,
)


def generate_certificate_pdf(
    db: Session, request_id: int, user_name: str = "System"
) -> str:
    """
    Generate PDF certificate for a request.

    Flow:
    1. Load request
    2. Validate status and verification token
    3. Resolve + render certificate template
    4. Generate PDF and audit the operation
    """

    request_repo = CertificateRequestRepository(db)
    signature_repo = AuthorizedOfficialRepository(db)
    student_address_repo = StudentAddressRepository(db)
    audit_repo = AuditLogRepository(db)
    request = request_repo.get_by_id(request_id)

    if not request:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Request not found"
        )

    if not request.verification_token:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot generate certificate: Request must be approved first to have a verification token",
        )

    if request.status not in [
        RequestStatus.PROCESSING,
        RequestStatus.FOR_RELEASING,
        RequestStatus.RELEASED,
    ]:
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
    enrollments = dependencies.get("enrollments") or []
    graduation_record = dependencies.get("graduation_record")
    academic_summary = dependencies.get("academic_summary") or {}
    nstp_record = dependencies.get("nstp_record")
    student_id_record = dependencies.get("student_id_record")

    try:
        default_signature = signature_repo.latest_active()
    except Exception:
        # Signature table may not be present yet in new schema.
        try:
            db.rollback()
        except Exception:
            pass
        default_signature = None

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

    student_address = ""
    if student:
        addr = student_address_repo.latest_for_student(student.id)
        if addr:
            student_address = ", ".join(
                [
                    p
                    for p in [
                        addr.address_line,
                        addr.city,
                        addr.province,
                        addr.zip_code,
                        addr.country,
                    ]
                    if p
                ]
            )

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

    def _semester_order(value: str) -> int:
        normalized = str(value or "").strip().lower()
        if normalized == "1st":
            return 1
        if normalized == "2nd":
            return 2
        if normalized == "summer":
            return 3
        return 9

    def _ay_start(ay: str) -> int:
        text = str(ay or "").strip()
        try:
            return int(text.split("-", 1)[0])
        except Exception:
            return 0

    enrollment_from_semester = ""
    enrollment_from_academic_year = ""
    enrollment_to_semester = ""
    enrollment_to_academic_year = ""
    first_enrollment_semester = ""
    first_enrollment_academic_year = ""
    curriculum = dependencies.get("curriculum")
    if enrollments:
        sorted_enrollments = sorted(
            enrollments,
            key=lambda row: (
                _ay_start(getattr(row, "academic_year", "")),
                _semester_order(getattr(row, "semester", "")),
                getattr(row, "year_level", 0) or 0,
            ),
        )
        print(f"[DEBUG] All enrollments for student:")
        for e in sorted_enrollments:
            print(f"  {e.academic_year} | {e.semester} | yr{e.year_level}")
        first = sorted_enrollments[0]
        print(f"[DEBUG] Resolved first: {first.semester} {first.academic_year}")
        last = sorted_enrollments[-1]
        first_enrollment_semester = str(getattr(first, "semester", "") or "")
        first_enrollment_academic_year = str(getattr(first, "academic_year", "") or "")
        enrollment_from_semester = str(getattr(first, "semester", "") or "")
        enrollment_from_academic_year = str(getattr(first, "academic_year", "") or "")
        enrollment_to_semester = str(getattr(last, "semester", "") or "")
        enrollment_to_academic_year = str(getattr(last, "academic_year", "") or "")

    date_of_graduation = ""
    is_graduated = False
    graduation_status = ""
    if graduation_record and getattr(graduation_record, "date_of_graduation", None):
        date_val = graduation_record.date_of_graduation
        if hasattr(date_val, "strftime"):
            date_of_graduation = date_val.strftime("%B %d, %Y")
        else:
            date_of_graduation = str(date_val)
    if graduation_record:
        is_graduated = bool(getattr(graduation_record, "is_graduated", False))
        graduation_status = str(getattr(graduation_record, "status", "") or "")

    overall_gwa = (
        academic_summary.get("gwa") if isinstance(academic_summary, dict) else None
    )
    total_units_earned = (
        academic_summary.get("total_units_earned")
        if isinstance(academic_summary, dict)
        else None
    )
    cumulative_units_earned = (
        academic_summary.get("cumulative_units_earned")
        if isinstance(academic_summary, dict)
        else None
    )

    data = {
        "student_name": student_name,
        "sr_code": student.sr_code if student else request.sr_code,
        "program": program_name,
        "program_name": program_name,
        "major": (student.major if student else None) or request.major,
        "year_graduated": request.year_graduated
        or (date_of_graduation[-4:] if date_of_graduation else ""),
        "is_graduated": is_graduated,
        "graduation_status": graduation_status,
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
        "curriculum_acad_year": (
            getattr(curriculum, "academic_year", "") if curriculum else ""
        ),
        "name_official": default_signature.name if default_signature else "",
        "official_title": default_signature.title if default_signature else "",
        "signature_path": default_signature.signature_path if default_signature else "",
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
        "student_address": student_address,
        "graduated_date": date_of_graduation,
        "board_resolution_num": (
            getattr(graduation_record, "board_resolution_number", "")
            if graduation_record
            else ""
        ),
        "course_board_resolution_num": (
            getattr(program, "course_board_resolution_num", "") if program else ""
        ),
        "course_academic_year": (
            getattr(program, "course_academic_year", "") if program else ""
        ),
        "overall_gwa": overall_gwa if overall_gwa is not None else "",
        "total_credits_earned": (
            total_units_earned if total_units_earned is not None else ""
        ),
        "total_units_earned": (
            total_units_earned if total_units_earned is not None else ""
        ),
        "first_enrollment_semester": first_enrollment_semester or current_semester,
        "first_enrollment_academic_year": first_enrollment_academic_year
        or academic_year,
        "enrollment_from_semester": enrollment_from_semester,
        "enrollment_from_academic_year": enrollment_from_academic_year,
        "enrollment_to_semester": enrollment_to_semester,
        "enrollment_to_academic_year": enrollment_to_academic_year,
        "requestor_name": request.requestor_name,
        "date_issued": now.strftime("%B %d, %Y"),
        "date_issued_day": day_text,
        "date_issued_month": month_text,
        "request_purpose": request.purpose,
        "request_amount": getattr(request, "request_cost", "") or "",
        "cav_no": request.reference_number,
        "series_no": getattr(request, "or_number", "") or "",
        "student_id_number": student.sr_code if student else request.sr_code,
        "nstp_component": getattr(nstp_record, "component", "") if nstp_record else "",
        "nstp_serial_number": (
            getattr(nstp_record, "serial_number", "") if nstp_record else ""
        ),
    }

    if data.get("signature_path"):
        try:
            sig_path = str(data["signature_path"]).replace("\\", "/")
            if not sig_path.startswith(("http://", "https://", "data:")):
                sig_path = os.path.abspath(sig_path)
            data["signature_path"] = sig_path
        except Exception:
            pass

    # Attendance periods for English Medium V1
    if enrollments:
        periods = [f"{e.semester} {e.academic_year}" for e in enrollments]
        data["attendance_periods"] = ", ".join(periods)

    # Grades + course descriptions
    student_courses = dependencies.get("student_courses") or []
    if student_courses:
        data["grades_detail"] = [
            {
                "course_code": row.get("course_code", ""),
                "course_title": row.get("course_title", ""),
                "units": row.get("units", ""),
                "grade": row.get("grade", ""),
            }
            for row in student_courses
        ]
        data["course_descriptions"] = [
            {
                "course_code": row.get("course_code", ""),
                "course_credits": row.get("units", ""),
                "course_description": row.get("course_title", ""),
            }
            for row in student_courses
        ]
        # Legacy single-item fallbacks
        first = student_courses[0]
        data["course_code"] = first.get("course_code", "")
        data["course_title"] = first.get("course_title", "")
        data["course_units"] = first.get("units", "")
        data["course_grades"] = first.get("grade", "")
        data["course_credits"] = first.get("units", "")
        data["course_description"] = first.get("course_description", "")

    output_dir = "uploads/certificates"
    os.makedirs(output_dir, exist_ok=True)
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    filename = f"{request.reference_number}_{timestamp}.pdf"
    pdf_path = os.path.join(output_dir, filename)

    try:
        pdf_bytes = CertificateEngine.generate(resolved_key, data)
        with open(pdf_path, "wb") as file:
            file.write(pdf_bytes)
    except Exception as exc:
        # Fallback: render a simplified PDF without the HTML renderer.
        try:
            from app.utils.template_engine import CertificateTemplateEngine
            from app.utils.pdf_generator import CertificateGenerator

            engine = CertificateTemplateEngine()
            template_path = engine.resolve_template_path(resolved_key, data)
            rendered_html = engine.render_template(template_path, data)
            header_lines, title, body_lines, footer = engine.extract_render_content(
                rendered_html
            )

            generator = CertificateGenerator(output_dir=output_dir)
            certificate_data = {
                "reference_number": request.reference_number,
                "purpose": request.purpose,
                "verification_token": request.verification_token,
                "issue_date": datetime.now().strftime("%B %d, %Y"),
                "template_header_lines": header_lines,
                "template_title": title,
                "template_body_lines": body_lines,
                "template_footer": footer,
                "source_template": template_path.name,
            }
            pdf_path = generator.generate_certificate(
                certificate_data, filename=filename
            )
        except Exception as fallback_exc:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Failed to generate certificate: {str(exc)}",
            ) from fallback_exc

    request.pdf_path = pdf_path

    audit_log = AuditLog(
        action="CERTIFICATE_GENERATED",
        entity_type="certificate_request",
        entity_id=request_id,
        field_name="pdf_path",
        new_value=pdf_path,
        user_name=user_name,
        notes="Certificate PDF generated from mapped template successfully",
    )
    audit_repo.add(audit_log)
    db.commit()
    db.refresh(request)

    return pdf_path


def get_certificate_data_from_student_db(db: Session, sr_code: str) -> dict:
    """
    Fetch student data from mock database and prepare for certificate.
    """
    from app.models.student import Student

    student_repo = StudentRepository(db)
    student = student_repo.get_by_sr_code(sr_code)

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
