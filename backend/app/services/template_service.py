from __future__ import annotations

from datetime import datetime
from typing import Any

from app.certificate_dependencies import DEFAULT_FILL_DEPENDENCIES, TEMPLATE_FILL_DEPENDENCIES
from app.database import SessionLocal
from app.models.certificate_dependency_data import CourseDescriptionRecord, EarnedUnitsRecord, GWARecord, HonorGraduateRecord
from app.models.registrar_simulation import CourseCatalog, Enrollment, Grade, Graduate, SemesterGWA, StudentRecord
from sqlalchemy import case
from sqlalchemy import func
from app.utils.pdf_generator import CertificateGenerator
from app.utils.template_engine import CertificateTemplateEngine
import re


class CertificateTemplateService:
    """Builds request context, renders template content, and generates certificate PDFs."""

    def __init__(self):
        self.template_engine = CertificateTemplateEngine()
        self.pdf_generator = CertificateGenerator()

    def generate_for_request(self, request, signatures: list[dict[str, Any]] | None = None) -> str:
        context = self._build_context(request)
        template_path = self.template_engine.resolve_template_path(request.certificate_type_name, context)
        context["legacy_fill_values"] = self._build_legacy_fill_values(request, context, template_path)
        rendered_html = self.template_engine.render_template(template_path, context)

        certificate_data = {
            "student_name": request.student_name,
            "sr_code": request.sr_code,
            "program": request.program,
            "major": request.major,
            "year_graduated": request.year_graduated,
            "certificate_type": request.certificate_type_name,
            "reference_number": request.reference_number,
            "purpose": request.purpose,
            "verification_token": request.verification_token,
            "signatures": signatures or [],
            "rendered_html": rendered_html,
            "template_base_path": str(template_path.parent),
            "source_template": template_path.name,
            "issue_date": datetime.now().strftime("%B %d, %Y"),
        }

        return self.pdf_generator.generate_certificate(certificate_data)

    def _build_context(self, request) -> dict[str, Any]:
        now = datetime.now()
        month_text = now.strftime("%B")
        full_date = now.strftime("%B %d, %Y")

        return {
            "student_name": request.student_name,
            "sr_code": request.sr_code or "",
            "program": request.program,
            "major": request.major or "",
            "year_graduated": request.year_graduated or "",
            "certificate_type": request.certificate_type_name,
            "reference_number": request.reference_number,
            "purpose": request.purpose,
            "requestor_name": request.requestor_name,
            "requestor_relationship": request.requestor_relationship,
            "requestor_address": request.requestor_address,
            "requestor_contact": request.requestor_contact,
            "requestor_email": request.requestor_email,
            "verification_token": request.verification_token or "",
            "day": str(now.day),
            "month": month_text,
            "year": str(now.year),
            "date_today": full_date,
            "issuance_year": str(now.year),
            "semester": "1st",
            "academic_year": f"{now.year}-{now.year + 1}",
            "campus_name": "Alangilan Campus",
            "campus_address": "Golden Country Homes, Alangilan, Batangas City",
            "campus_contact": "(+63) 43 425 0139",
            "campus_email": "registrar@g.batstate-u.edu.ph",
            "school_website": "batstate-u.edu.ph",
            "campus_email_website": "registrar@g.batstate-u.edu.ph | batstate-u.edu.ph",
            "legacy_fill_values": [],
        }

    def _build_legacy_fill_values(self, request, context: dict[str, Any], template_path) -> list[str]:
        snapshot = self._get_student_snapshot(request)
        context["student_sex"] = snapshot.get("sex", "")
        context["student_honorific"] = self._honorific_for_sex(snapshot.get("sex", ""))

        requestor_full_name = str(getattr(request, "requestor_name", "") or "")
        context["requestor_full_name"] = requestor_full_name
        requestor_display_name = self._format_requestor_display_name(
            relationship=str(getattr(request, "requestor_relationship", "") or ""),
            requestor_name=requestor_full_name,
            fallback_surname=str(snapshot.get("last_name", "") or "") or self._extract_surname(str(getattr(request, "student_name", "") or "")),
        )
        context["requestor_display_name"] = requestor_display_name
        # Backwards-compatible: templates and legacy fill slots typically use {{ requestor_name }}.
        context["requestor_name"] = requestor_display_name

        from_semester, from_academic_year, to_semester, to_academic_year = self._get_enrollment_range(
            request,
            default_semester=context.get("semester", "1st"),
            default_academic_year=context.get("academic_year", ""),
        )
        context["enrollment_from_semester"] = from_semester
        context["enrollment_from_academic_year"] = from_academic_year
        context["enrollment_to_semester"] = to_semester
        context["enrollment_to_academic_year"] = to_academic_year
        context["enrollment_is_single_semester"] = bool(
            from_semester == to_semester and from_academic_year == to_academic_year
        )

        semester = snapshot.get("latest_semester", context["semester"])
        academic_year = snapshot.get("latest_academic_year", context["academic_year"])
        ay_start, ay_end = self._split_academic_year(academic_year)
        if template_path.name == "Cert-of-Course-Desc.html":
            return self._build_course_desc_fill_values(request, context, template_path)

        values_by_dependency = {
            "student_name": request.student_name or "",
            "program": request.program or "",
            "major": request.major or "",
            "degree": request.program or "",
            "college_name": request.major or "",
            "year_level": snapshot.get("year_level_text", request.major or ""),
            "requestor_name": requestor_display_name,
            "purpose_of_request": request.purpose or "",
            "date_of_graduation": snapshot.get("date_of_graduation", request.year_graduated or ""),
            "id_number": request.sr_code or "",
            "nstp_serial_number": request.sr_code or "",
            "nstp_component": request.program or "",
            "board_resolution_number": snapshot.get("board_resolution_number", request.reference_number or ""),
            "academic_year": academic_year,
            "academic_year_start": ay_start,
            "academic_year_end": ay_end,
            "semester": semester,
            "issuance_day": context["day"],
            "issuance_month": context["month"],
            "issuance_year": context.get("year", ""),
            "credits": snapshot.get("earned_credits", ""),
            "gwa": snapshot.get("gwa", ""),
            "latin_honor": snapshot.get("latin_honor", ""),
            "address": snapshot.get("address", request.requestor_address or ""),
            "attendance_period": snapshot.get("attendance_period", ""),
            "regulation": snapshot.get("regulation", ""),
            "campus_address": context.get("campus_address", ""),
            "course_code_all": "",
            "credits_all": "",
            "course_description_all": "",
            "course_code_all_2": "",
            "credits_all_2": "",
            "course_description_all_2": "",
        }

        # Expose dependency values as named template variables for Jinja templates.
        # This enables templates to use {{ student_name }}, {{ academic_year }}, etc.
        for key, value in values_by_dependency.items():
            if key not in context and value is not None:
                context[key] = value

        template_dependencies = TEMPLATE_FILL_DEPENDENCIES.get(template_path.name, DEFAULT_FILL_DEPENDENCIES)
        values = [values_by_dependency.get(dep_key, "") for dep_key in template_dependencies]

        slot_count = self.template_engine.count_fill_slots(template_path)
        return self._fit_values_to_slots(values, slot_count)

    @staticmethod
    def _fit_values_to_slots(values: list[str], slot_count: int) -> list[str]:
        normalized = ["" if value is None else str(value) for value in values]
        if slot_count <= 0:
            return []
        if len(normalized) >= slot_count:
            return normalized[:slot_count]
        return normalized + ([""] * (slot_count - len(normalized)))

    @staticmethod
    def _split_academic_year(academic_year: str) -> tuple[str, str]:
        parts = str(academic_year or "").split("-")
        if len(parts) == 2:
            return parts[0], parts[1]
        return str(academic_year or ""), str(academic_year or "")

    def _build_course_desc_fill_values(self, request, context: dict[str, Any], template_path) -> list[str]:
        slot_count = self.template_engine.count_fill_slots(template_path)
        if slot_count <= 0:
            return []

        semester = context["semester"]
        academic_year = context["academic_year"]
        from_semester, from_academic_year, to_semester, to_academic_year = self._get_enrollment_range(
            request,
            default_semester=semester,
            default_academic_year=academic_year,
        )
        ay_start, ay_end = self._split_academic_year(to_academic_year)
        from_ay_start, from_ay_end = self._split_academic_year(from_academic_year)

        prefix_values = [
            request.student_name or "",
            request.program or "",
            from_semester,
            from_ay_start,
            from_ay_end,
            to_semester,
            ay_start,
            ay_end,
            request.program or "",
            ay_start,
            ay_end,
        ]
        suffix_values = [
            request.requestor_name or "",
            context["day"],
            context["month"],
            request.purpose or "",
        ]

        fixed_count = len(prefix_values) + len(suffix_values)
        course_slot_count = max(0, slot_count - fixed_count)
        course_row_count = course_slot_count // 3
        course_rows = self._get_course_description_rows(request, limit=course_row_count)

        course_values: list[str] = []
        for code, credits, description in course_rows:
            course_values.extend([code, credits, description])

        if len(course_values) < course_slot_count:
            course_values.extend([""] * (course_slot_count - len(course_values)))
        elif len(course_values) > course_slot_count:
            course_values = course_values[:course_slot_count]

        values = prefix_values + course_values + suffix_values
        return self._fit_values_to_slots(values, slot_count)

    @staticmethod
    def _get_course_description_rows(request, limit: int = 2) -> list[tuple[str, str, str]]:
        sr_code = (request.sr_code or "").strip()
        if not sr_code or limit <= 0:
            return []

        db = SessionLocal()
        try:
            # Primary source: registrar simulation academic records.
            rows = (
                db.query(
                    CourseCatalog.course_code,
                    CourseCatalog.units,
                    CourseCatalog.course_description,
                )
                .join(Grade, Grade.course_id == CourseCatalog.id)
                .join(Enrollment, Enrollment.id == Grade.enrollment_id)
                .filter(Grade.student_id == sr_code)
                .order_by(
                    Enrollment.academic_year.asc(),
                    case((Enrollment.semester == "1st", 1), (Enrollment.semester == "2nd", 2), else_=9),
                    Enrollment.year_level.asc(),
                    CourseCatalog.course_code.asc(),
                )
                .limit(limit)
                .all()
            )

            if rows:
                return [
                    (
                        str(code or ""),
                        str(units or ""),
                        str(description or ""),
                    )
                    for code, units, description in rows
                ]

            # Fallback source: legacy course description records.
            fallback = (
                db.query(
                    CourseDescriptionRecord.course_code,
                    CourseDescriptionRecord.credits,
                    CourseDescriptionRecord.course_description,
                )
                .filter(CourseDescriptionRecord.sr_code == sr_code)
                .order_by(CourseDescriptionRecord.id.desc())
                .limit(limit)
                .all()
            )

            return [
                (
                    str(code or ""),
                    str(credits or ""),
                    str(description or ""),
                )
                for code, credits, description in fallback
            ]
        finally:
            db.close()

    @staticmethod
    def _get_student_snapshot(request) -> dict[str, str]:
        sr_code = (request.sr_code or "").strip()
        if not sr_code:
            return {}

        db = SessionLocal()
        try:
            snapshot: dict[str, str] = {}
            semester_order = case((Enrollment.semester == "1st", 1), (Enrollment.semester == "2nd", 2), else_=9)

            first_enrollment = (
                db.query(Enrollment)
                .filter(Enrollment.student_id == sr_code)
                .order_by(Enrollment.academic_year.asc(), semester_order.asc(), Enrollment.year_level.asc())
                .first()
            )
            last_enrollment = (
                db.query(Enrollment)
                .filter(Enrollment.student_id == sr_code)
                .order_by(Enrollment.academic_year.desc(), semester_order.desc(), Enrollment.year_level.desc())
                .first()
            )

            if first_enrollment:
                snapshot["first_semester"] = str(first_enrollment.semester or "")
                snapshot["first_academic_year"] = str(first_enrollment.academic_year or "")
            if last_enrollment:
                snapshot["latest_semester"] = str(last_enrollment.semester or "")
                snapshot["latest_academic_year"] = str(last_enrollment.academic_year or "")
                snapshot["year_level_text"] = f"{last_enrollment.year_level}th Year"

            if first_enrollment and last_enrollment:
                snapshot["attendance_period"] = f"{first_enrollment.academic_year} to {last_enrollment.academic_year}"

            earned_units = (
                db.query(func.sum(CourseCatalog.units))
                .join(Grade, Grade.course_id == CourseCatalog.id)
                .filter(Grade.student_id == sr_code, Grade.grade <= 3.00)
                .scalar()
            )
            if earned_units is None:
                fallback_earned = (
                    db.query(EarnedUnitsRecord.credits)
                    .filter(EarnedUnitsRecord.sr_code == sr_code)
                    .order_by(EarnedUnitsRecord.id.desc())
                    .first()
                )
                if fallback_earned and fallback_earned.credits is not None:
                    earned_units = fallback_earned.credits
            if earned_units is not None:
                snapshot["earned_credits"] = str(round(float(earned_units), 2)).rstrip("0").rstrip(".")

            graduate = db.query(Graduate).filter(Graduate.student_id == sr_code).first()
            if graduate:
                snapshot["date_of_graduation"] = graduate.date_of_graduation.strftime("%B %d, %Y")
                snapshot["board_resolution_number"] = graduate.board_resolution_number or ""
                snapshot["latin_honor"] = graduate.latin_honor or ""
                if graduate.board_resolution_number:
                    snapshot["regulation"] = f"Board Resolution No. {graduate.board_resolution_number}"
            else:
                fallback_honor = (
                    db.query(HonorGraduateRecord)
                    .filter(HonorGraduateRecord.sr_code == sr_code)
                    .order_by(HonorGraduateRecord.id.desc())
                    .first()
                )
                if fallback_honor:
                    snapshot["date_of_graduation"] = str(fallback_honor.date_of_graduation or "")
                    snapshot["board_resolution_number"] = str(fallback_honor.board_resolution_number or "")
                    snapshot["latin_honor"] = str(fallback_honor.latin_honor or "")

            avg_gwa = db.query(func.avg(SemesterGWA.gwa)).filter(SemesterGWA.student_id == sr_code).scalar()
            if avg_gwa is None:
                fallback_gwa = (
                    db.query(GWARecord.gwa)
                    .filter(GWARecord.sr_code == sr_code)
                    .order_by(GWARecord.id.desc())
                    .first()
                )
                if fallback_gwa and fallback_gwa.gwa is not None:
                    avg_gwa = fallback_gwa.gwa
            if avg_gwa is not None:
                snapshot["gwa"] = f"{float(avg_gwa):.2f}"

            student_record = db.query(StudentRecord).filter(StudentRecord.sr_code == sr_code).first()
            if student_record:
                if student_record.address:
                    snapshot["address"] = student_record.address
                snapshot["sex"] = str(student_record.sex or "")
                snapshot["last_name"] = str(student_record.last_name or "")

            return snapshot
        finally:
            db.close()

    @staticmethod
    def _honorific_for_sex(value: str) -> str:
        normalized = str(value or "").strip().lower()
        if normalized in {"male", "m"}:
            return "Mr."
        if normalized in {"female", "f"}:
            return "Ms."
        return "Mr./Ms."

    @staticmethod
    def _extract_surname(full_name: str) -> str:
        name = str(full_name or "").strip()
        if not name:
            return ""
        if "," in name:
            return name.split(",", 1)[0].strip()

        tokens = [t for t in re.split(r"\s+", name) if t]
        if len(tokens) >= 3 and tokens[-3].lower() == "de" and tokens[-2].lower() == "la":
            return " ".join(tokens[-3:])
        if len(tokens) >= 2 and tokens[-2].lower() in {"de", "del", "dela", "da", "dos", "das", "di", "van", "von"}:
            return " ".join(tokens[-2:])
        return tokens[-1] if tokens else ""

    @classmethod
    def _format_requestor_display_name(cls, relationship: str, requestor_name: str, fallback_surname: str) -> str:
        rel = str(relationship or "").strip().lower()
        full = str(requestor_name or "").strip()
        if rel in {"self", "same person", "same_person", "sameperson"}:
            surname = str(fallback_surname or "").strip()
            if surname:
                return surname
            return cls._extract_surname(full)
        return full

    @staticmethod
    def _get_enrollment_range(
        request,
        default_semester: str,
        default_academic_year: str,
    ) -> tuple[str, str, str, str]:
        sr_code = (request.sr_code or "").strip()
        if not sr_code:
            return default_semester, default_academic_year, default_semester, default_academic_year

        db = SessionLocal()
        try:
            semester_order = case((Enrollment.semester == "1st", 1), (Enrollment.semester == "2nd", 2), else_=9)

            first_row = (
                db.query(Enrollment.semester, Enrollment.academic_year)
                .filter(Enrollment.student_id == sr_code)
                .order_by(Enrollment.academic_year.asc(), semester_order.asc(), Enrollment.year_level.asc())
                .first()
            )
            last_row = (
                db.query(Enrollment.semester, Enrollment.academic_year)
                .filter(Enrollment.student_id == sr_code)
                .order_by(Enrollment.academic_year.desc(), semester_order.desc(), Enrollment.year_level.desc())
                .first()
            )

            if not first_row or not last_row:
                return default_semester, default_academic_year, default_semester, default_academic_year

            return (
                str(first_row.semester or default_semester),
                str(first_row.academic_year or default_academic_year),
                str(last_row.semester or default_semester),
                str(last_row.academic_year or default_academic_year),
            )
        finally:
            db.close()
