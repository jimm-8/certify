from sqlalchemy.orm import Session
from fastapi import HTTPException, status
from time import perf_counter

from app.models.audit_log import AuditLog
from app.models.certificate_request import CertificateRequest, RequestStatus
from app.models.authorized_official import AuthorizedOfficial
import os
from datetime import datetime
import json

from app.engine.certificate_engine import CertificateEngine
from app.engine.certificate_dependency_engine import CertificateDependencyEngine
from app.models.student_address import StudentAddress
from app.repositories import (
    AuditLogRepository,
    AuthorizedOfficialRepository,
    CertificateRequestRepository,
    PaymentRepository,
    StudentAddressRepository,
    StudentRepository,
)
from app.services.purpose_service import certificate_purpose_text
from app.services.settings_service import get_bool_setting


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
    payment_repo = PaymentRepository(db)
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

    def _number_to_words(n: int) -> str:
        small_numbers = {
            0: "zero",
            1: "first",
            2: "second",
            3: "third",
            4: "fourth",
            5: "fifth",
            6: "sixth",
            7: "seventh",
            8: "eighth",
            9: "ninth",
            10: "tenth",
            11: "eleventh",
            12: "twelfth",
            13: "thirteenth",
            14: "fourteenth",
            15: "fifteenth",
            16: "sixteenth",
            17: "seventeenth",
            18: "eighteenth",
            19: "nineteenth",
            20: "twentieth",
        }
        tens_map = {
            20: "twenty",
            30: "thirty",
            40: "forty",
            50: "fifty",
            60: "sixty",
            70: "seventy",
            80: "eighty",
            90: "ninety",
        }
        ordinal_suffix_map = {
            1: "first",
            2: "second",
            3: "third",
            4: "fourth",
            5: "fifth",
            6: "sixth",
            7: "seventh",
            8: "eighth",
            9: "ninth",
        }

        if n in small_numbers:
            return small_numbers[n]
        if n < 100:
            tens = (n // 10) * 10
            ones = n % 10
            if ones == 0:
                tens_word = tens_map.get(tens, str(tens))
                return (
                    f"{tens_word[:-1]}ieth"
                    if tens_word.endswith("y")
                    else f"{tens_word}ieth"
                )
            ones_word = ordinal_suffix_map.get(ones, small_numbers.get(ones, str(ones)))
            return f"{tens_map.get(tens, str(tens))}-{ones_word}"
        return str(n)

    def _format_year_level(value) -> str:
        try:
            return _number_to_words(int(value))
        except (TypeError, ValueError):
            return str(value or "")

    def _format_semester(value: str) -> str:
        normalized = str(value or "").strip().lower()
        semester_map = {
            "1st": "First",
            "first": "First",
            "2nd": "Second",
            "second": "Second",
            "3rd": "Third",
            "third": "Third",
            "summer": "Summer",
        }
        return semester_map.get(normalized, str(value or "").strip())

    def _honorific_for_gender(value: str) -> str:
        normalized = str(value or "").strip().lower()
        if normalized in {"male", "m"}:
            return "Mr."
        if normalized in {"female", "f"}:
            return "Ms."
        return "Mr./Ms."

    def _extract_surname(full_name: str) -> str:
        name = str(full_name or "").strip()
        if not name:
            return ""
        if "," in name:
            return name.split(",", 1)[0].strip()
        tokens = [t for t in name.split() if t]
        if (
            len(tokens) >= 3
            and tokens[-3].lower() == "de"
            and tokens[-2].lower() == "la"
        ):
            return " ".join(tokens[-3:])
        if len(tokens) >= 2 and tokens[-2].lower() in {
            "de",
            "del",
            "dela",
            "da",
            "dos",
            "das",
            "di",
            "van",
            "von",
        }:
            return " ".join(tokens[-2:])
        return tokens[-1] if tokens else ""

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

    use_wet_signature = get_bool_setting(db, "use_wet_signature", False)
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
    year_text = str(now.year)

    student_name = _format_student_name(student) or request.student_name
    student_gender = (getattr(student, "gender", None) if student else None) or ""
    student_honorific = _honorific_for_gender(student_gender)
    student_surname = (
        (getattr(student, "last_name", None) if student else None)
        or _extract_surname(student_name)
        or ""
    )
    program_name = (program.name if program else None) or request.program
    college_name = (college.name if college else None) or ""
    campus_name = (campus.name if campus else None) or ""
    campus_address = (campus.campus_address if campus else None) or ""
    campus_telNo = (campus.campus_telNo if campus else None) or ""
    campus_email = (campus.campus_email if campus else None) or ""
    campus_certCode = (campus.campus_certCode if campus else None) or ""
    payment = payment_repo.get_by_reference(request.reference_number)
    date_of_payment = ""
    or_number = ""
    if payment:
        if getattr(payment, "date_of_payment", None):
            date_of_payment = payment.date_of_payment.strftime("%B %d, %Y")
        or_number = getattr(payment, "or_number", "") or ""

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
                        addr.country,
                        addr.zip_code,
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
                year_level = _format_year_level(enrollment.year_level)
            except (TypeError, ValueError):
                year_level = str(enrollment.year_level)
        current_semester = _format_semester(enrollment.semester)
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
        first_enrollment_semester = _format_semester(getattr(first, "semester", ""))
        first_enrollment_academic_year = str(getattr(first, "academic_year", "") or "")
        enrollment_from_semester = _format_semester(getattr(first, "semester", ""))
        enrollment_from_academic_year = str(getattr(first, "academic_year", "") or "")
        enrollment_to_semester = _format_semester(getattr(last, "semester", ""))
        enrollment_to_academic_year = str(getattr(last, "academic_year", "") or "")

    date_of_graduation = ""
    is_graduated = False
    graduation_status = ""
    if graduation_record and getattr(graduation_record, "date_of_graduation", None):
        date_val = graduation_record.date_of_graduation
        if hasattr(date_val, "strftime"):
            date_of_graduation = date_val.strftime("%B %d, %Y")
        else:
            try:
                date_of_graduation = datetime.strptime(
                    str(date_val), "%Y-%m-%d"
                ).strftime("%B %d, %Y")
            except ValueError:
                date_of_graduation = str(date_val)
    if graduation_record:
        is_graduated = bool(getattr(graduation_record, "is_graduated", False))
        graduation_status = str(getattr(graduation_record, "status", "") or "")

    overall_gwa = (
        academic_summary.get("gwa") if isinstance(academic_summary, dict) else None
    )
    is_currently_enrolled = bool(
        getattr(student_id_record, "is_currently_enrolled", False)
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

    latin_honor = ""

    if graduation_record:
        latin_honor = getattr(graduation_record, "latin_honor", "") or ""

    def _pronoun_for_gender(value: str) -> str:
        normalized = str(value or "").strip().lower()
        if normalized in {"male", "m"}:
            return "he"
        if normalized in {"female", "f"}:
            return "she"
        return "he/she"

    student_pronoun = _pronoun_for_gender(student_gender)
    request_purpose_display = certificate_purpose_text(
        request.purpose,
        getattr(request, "purpose_category", None),
    )
    data = {
        "student_name": student_name,
        "student_honorific": student_honorific,
        "student_surname": student_surname,
        "sr_code": student.sr_code if student else request.sr_code,
        "program": program_name,
        "latin_honor": latin_honor,
        "program_name": program_name,
        "major": (student.major if student else None) or request.major,
        "year_graduated": request.year_graduated
        or (date_of_graduation[-4:] if date_of_graduation else ""),
        "is_graduated": is_graduated,
        "is_currently_enrolled": is_currently_enrolled,
        "graduation_status": graduation_status,
        "reference_number": request.reference_number,
        "control_num": getattr(request, "control_num", "") or "",
        "or_number": or_number,
        "date_of_payment": date_of_payment,
        "purpose": request.purpose,
        "verification_code": request.verification_token,
        "requestor_name": request.requestor_name,
        "requestor_relationship": request.requestor_relationship,
        "requestor_address": request.requestor_address,
        "requestor_contact": request.requestor_contact,
        "requestor_email": request.requestor_email,
        "certificate_type": resolved_key,
        "attendance_periods": "",
        "student_pronoun": student_pronoun,
        "curriculum_acad_year": (
            getattr(curriculum, "academic_year", "") if curriculum else ""
        ),
        "name_official": default_signature.name if default_signature else "",
        "official_title": default_signature.title if default_signature else "",
        "signature_path": (
            ""
            if use_wet_signature
            else (default_signature.signature_path if default_signature else "")
        ),
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
        "date_issued_year": year_text,
        "request_purpose": request_purpose_display,
        "request_amount": getattr(request, "request_cost", "") or "",
        "cav_no": request.reference_number,
        "series_no": getattr(request, "control_num", "") or "",
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

        def _format_period(e):
            sem = _format_semester(getattr(e, "semester", ""))
            ay = str(getattr(e, "academic_year", "") or "").strip()
            if sem.lower() in ("first", "second", "third"):
                sem = f"{sem} Semester"
            return f"{sem}, Academic Year {ay}".strip()

        seen = set()
        unique_periods = []
        for e in sorted_enrollments:
            period = _format_period(e)
            if period not in seen:
                seen.add(period)
                unique_periods.append(period)

        data["attendance_periods"] = unique_periods  # pass as list

    # Grades + course descriptions
    student_courses = dependencies.get("student_courses") or []
    selected_codes = []
    if getattr(request, "course_description_selection", None):
        try:
            selected_codes = json.loads(request.course_description_selection) or []
        except Exception:
            selected_codes = []
    if selected_codes:
        code_set = {str(c).strip() for c in selected_codes if str(c).strip()}
        filtered = [
            row for row in student_courses if row.get("course_code") in code_set
        ]
        if filtered:
            by_code = {row.get("course_code"): row for row in filtered}
            ordered = [by_code[c] for c in selected_codes if c in by_code]
            student_courses = ordered or filtered
    if "grade" in str(request.certificate_type_name or "").lower() and getattr(
        request, "grade_selection", None
    ):
        try:
            selected_keys = json.loads(request.grade_selection) or []
        except Exception:
            selected_keys = []
        if selected_keys:
            key_set = {str(k).strip() for k in selected_keys if str(k).strip()}

            def _row_key(row):
                return (
                    f"{row.get('course_code','')}||"
                    f"{row.get('academic_year','')}||"
                    f"{row.get('semester','')}"
                )

            filtered = [row for row in student_courses if _row_key(row) in key_set]
            if filtered:
                by_key = {_row_key(r): r for r in filtered}
                ordered = [by_key[k] for k in selected_keys if k in by_key]
                student_courses = ordered or filtered
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
                "course_title": row.get("course_title", ""),
                "course_description": row.get("course_description", ""),
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
    generation_started_at = datetime.now()
    generation_started_timer = perf_counter()

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
    request.pdf_generated_at = generation_started_at
    request.pdf_generation_time_ms = max(
        1, int(round((perf_counter() - generation_started_timer) * 1000))
    )

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
