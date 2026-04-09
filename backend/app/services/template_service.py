from __future__ import annotations

from datetime import datetime
from typing import Any

from app.certificate_dependencies import (
    DEFAULT_FILL_DEPENDENCIES,
    TEMPLATE_FILL_DEPENDENCIES,
)
from app.database import SessionLocal
from app.models.enrollment import Enrollment
from app.models.grade import Grade
from app.models.course import Course
from app.models.student import Student
from app.models.student_address import StudentAddress
from app.models.academic_summary import AcademicSummary
from app.models.graduation_record import GraduationRecordNew
from app.repositories import (
    AcademicSummaryRepository,
    CourseRepository,
    EnrollmentRepository,
    GraduationRecordRepository,
    StudentAddressRepository,
    StudentRepository,
)
from sqlalchemy import case
from sqlalchemy import func
from app.utils.pdf_generator import CertificateGenerator
from app.utils.template_engine import CertificateTemplateEngine
import re
import json


class CertificateTemplateService:
    """Builds request context, renders template content, and generates certificate PDFs."""

    def __init__(self):
        self.template_engine = CertificateTemplateEngine()
        self.pdf_generator = CertificateGenerator()

    def generate_for_request(
        self,
        request,
        signatures: list[dict[str, Any]] | None = None,
        extra_context: dict[str, Any] | None = None,
    ) -> str:
        context = self._build_context(request, extra_context=extra_context)
        template_path = self.template_engine.resolve_template_path(
            request.certificate_type_name, context
        )
        context["legacy_fill_values"] = self._build_legacy_fill_values(
            request, context, template_path
        )
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

    def _build_context(
        self, request, extra_context: dict[str, Any] | None = None
    ) -> dict[str, Any]:
        now = datetime.now()
        month_text = now.strftime("%B")
        full_date = now.strftime("%B %d, %Y")

        context = {
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
            "date_issued": full_date,
            "date_issued_day": str(now.day),
            "date_issued_month": month_text,
            "date_issued_year": str(now.year),
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
        if extra_context:
            context.update(extra_context)
        return context

    def _build_legacy_fill_values(
        self, request, context: dict[str, Any], template_path
    ) -> list[str]:
        snapshot = self._get_student_snapshot(request)
        context["student_sex"] = snapshot.get("sex", "")
        context["student_honorific"] = self._honorific_for_sex(snapshot.get("sex", ""))
        context["student_pronoun"] = self._pronoun_for_sex(snapshot.get("sex", ""))
        context["student_surname"] = str(
            snapshot.get("last_name", "") or ""
        ) or self._extract_surname(str(getattr(request, "student_name", "") or ""))
        if snapshot.get("latest_semester"):
            context["semester"] = snapshot["latest_semester"]
            context["current_sem"] = snapshot["latest_semester"]
        if snapshot.get("latest_academic_year"):
            context["academic_year"] = snapshot["latest_academic_year"]
        if snapshot.get("year_level_text"):
            context["student_year"] = snapshot["year_level_text"]
        context.setdefault("course_name", request.program or "")
        context.setdefault("request_purpose", request.purpose or "")
        if snapshot.get("attendance_period"):
            context.setdefault("attendance_periods", [snapshot["attendance_period"]])
        if snapshot.get("earned_credits"):
            context.setdefault("total_credits_earned", snapshot["earned_credits"])

        requestor_full_name = str(getattr(request, "requestor_name", "") or "")
        context["requestor_full_name"] = requestor_full_name
        requestor_display_name = self._format_requestor_display_name(
            relationship=str(getattr(request, "requestor_relationship", "") or ""),
            requestor_name=requestor_full_name,
            fallback_surname=str(snapshot.get("last_name", "") or "")
            or self._extract_surname(str(getattr(request, "student_name", "") or "")),
        )
        context["requestor_display_name"] = requestor_display_name
        # Backwards-compatible: templates and legacy fill slots typically use {{ requestor_name }}.
        context["requestor_name"] = requestor_display_name

        from_semester, from_academic_year, to_semester, to_academic_year = (
            self._get_enrollment_range(
                request,
                default_semester=context.get("semester", "1st"),
                default_academic_year=context.get("academic_year", ""),
            )
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
            "date_of_graduation": snapshot.get(
                "date_of_graduation", request.year_graduated or ""
            ),
            "id_number": request.sr_code or "",
            "nstp_serial_number": request.sr_code or "",
            "nstp_component": request.program or "",
            "board_resolution_number": snapshot.get(
                "board_resolution_number", request.reference_number or ""
            ),
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

        template_dependencies = TEMPLATE_FILL_DEPENDENCIES.get(
            template_path.name, DEFAULT_FILL_DEPENDENCIES
        )
        values = [
            values_by_dependency.get(dep_key, "") for dep_key in template_dependencies
        ]

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

    def _build_course_desc_fill_values(
        self, request, context: dict[str, Any], template_path
    ) -> list[str]:
        slot_count = self.template_engine.count_fill_slots(template_path)
        if slot_count <= 0:
            return []

        semester = context["semester"]
        academic_year = context["academic_year"]
        from_semester, from_academic_year, to_semester, to_academic_year = (
            self._get_enrollment_range(
                request,
                default_semester=semester,
                default_academic_year=academic_year,
            )
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
    def _get_course_description_rows(
        request, limit: int = 2
    ) -> list[tuple[str, str, str]]:
        sr_code = (request.sr_code or "").strip()
        if not sr_code or limit <= 0:
            return []
        selected_codes: list[str] = []
        if getattr(request, "course_description_selection", None):
            try:
                selected_codes = json.loads(request.course_description_selection) or []
            except Exception:
                selected_codes = []

        db = SessionLocal()
        try:
            # Primary source: registrar simulation academic records.
            rows = (
                CourseRepository(db)
                .query_with(
                    Course.course_code,
                    Course.units,
                    Course.course_description,
                )
                .join(Grade, Grade.course_id == Course.id)
                .join(Enrollment, Enrollment.id == Grade.enrollment_id)
                .filter(Grade.student_id == sr_code)
                .order_by(
                    Enrollment.academic_year.desc(),
                    case(
                        (Enrollment.semester == "1st", 1),
                        (Enrollment.semester == "2nd", 2),
                        else_=9,
                    ).desc(),
                    Enrollment.year_level.desc(),
                    Course.course_code.asc(),
                )
                .limit(limit)
                .all()
            )

            if rows:
                mapped = [
                    {
                        "course_code": str(code or ""),
                        "course_title": str(title or ""),  # include this if available
                        "course_credits": str(units or ""),
                        "course_description": str(description or ""),
                    }
                    for code, title, units, description in rows
                ]
                if selected_codes:
                    code_set = {
                        str(c).strip() for c in selected_codes if str(c).strip()
                    }
                    filtered = [row for row in mapped if row[0] in code_set]
                    if filtered:
                        by_code = {row[0]: row for row in filtered}
                        ordered = [by_code[c] for c in selected_codes if c in by_code]
                        return ordered or filtered
                return mapped
            return []
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
            semester_order = case(
                (Enrollment.semester == "1st", 1),
                (Enrollment.semester == "2nd", 2),
                else_=9,
            )

            first_enrollment = (
                EnrollmentRepository(db)
                .query()
                .filter(Enrollment.student_id == sr_code)
                .order_by(
                    Enrollment.academic_year.asc(),
                    semester_order.asc(),
                    Enrollment.year_level.asc(),
                )
                .first()
            )
            last_enrollment = (
                EnrollmentRepository(db)
                .query()
                .filter(Enrollment.student_id == sr_code)
                .order_by(
                    Enrollment.academic_year.desc(),
                    semester_order.desc(),
                    Enrollment.year_level.desc(),
                )
                .first()
            )

            if first_enrollment:
                snapshot["first_semester"] = str(first_enrollment.semester or "")
                snapshot["first_academic_year"] = str(
                    first_enrollment.academic_year or ""
                )
            if last_enrollment:
                snapshot["latest_semester"] = str(last_enrollment.semester or "")
                snapshot["latest_academic_year"] = str(
                    last_enrollment.academic_year or ""
                )
                snapshot["year_level_text"] = f"{last_enrollment.year_level}th Year"

            if first_enrollment and last_enrollment:
                snapshot["attendance_period"] = (
                    f"{first_enrollment.academic_year} to {last_enrollment.academic_year}"
                )

            earned_units = (
                CourseRepository(db)
                .query_with(func.sum(Course.units))
                .join(Grade, Grade.course_id == Course.id)
                .filter(Grade.student_id == sr_code, Grade.grade <= 3.00)
                .scalar()
            )
            if earned_units is not None:
                snapshot["earned_credits"] = (
                    str(round(float(earned_units), 2)).rstrip("0").rstrip(".")
                )

            grad_new = GraduationRecordRepository(db).get_by_sr_code(sr_code)
            if grad_new:
                snapshot["date_of_graduation"] = str(grad_new.date_of_graduation or "")
                snapshot["board_resolution_number"] = str(
                    grad_new.board_resolution_number or ""
                )
                snapshot["latin_honor"] = str(grad_new.latin_honor or "")
            else:
                pass

            summary = (
                AcademicSummaryRepository(db)
                .query()
                .filter(AcademicSummary.sr_code == sr_code)
                .order_by(
                    AcademicSummary.academic_year.desc(),
                    AcademicSummary.semester.desc(),
                )
                .first()
            )
            avg_gwa = summary.gwa if summary and summary.gwa is not None else None
            if avg_gwa is not None:
                snapshot["gwa"] = f"{float(avg_gwa):.2f}"
            if (
                ("earned_credits" not in snapshot or not snapshot.get("earned_credits"))
                and summary
                and summary.total_units_earned is not None
            ):
                snapshot["earned_credits"] = str(summary.total_units_earned)
            if (
                ("earned_credits" not in snapshot or not snapshot.get("earned_credits"))
                and summary
                and summary.cumulative_units_earned is not None
            ):
                snapshot["earned_credits"] = str(summary.cumulative_units_earned)

            student = StudentRepository(db).get_by_sr_code(sr_code)
            if student:
                snapshot["sex"] = str(student.gender or "")
                snapshot["last_name"] = str(student.last_name or "")
                address = StudentAddressRepository(db).latest_for_student(student.id)
                if address:
                    snapshot["address"] = ", ".join(
                        [
                            p
                            for p in [
                                address.address_line,
                                address.city,
                                address.province,
                                address.zip_code,
                                address.country,
                            ]
                            if p
                        ]
                    )

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
    def _pronoun_for_sex(value: str) -> str:
        normalized = str(value or "").strip().lower()
        if normalized in {"male", "m"}:
            return "he"
        if normalized in {"female", "f"}:
            return "she"
        return "he/she"

    @staticmethod
    def _extract_surname(full_name: str) -> str:
        name = str(full_name or "").strip()
        if not name:
            return ""
        if "," in name:
            return name.split(",", 1)[0].strip()

        tokens = [t for t in re.split(r"\s+", name) if t]
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

    @classmethod
    def _format_requestor_display_name(
        cls, relationship: str, requestor_name: str, fallback_surname: str
    ) -> str:
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
            return (
                default_semester,
                default_academic_year,
                default_semester,
                default_academic_year,
            )

        db = SessionLocal()
        try:
            semester_order = case(
                (Enrollment.semester == "1st", 1),
                (Enrollment.semester == "2nd", 2),
                else_=9,
            )

            first_row = (
                EnrollmentRepository(db)
                .query_with(Enrollment.semester, Enrollment.academic_year)
                .filter(Enrollment.student_id == sr_code)
                .order_by(
                    Enrollment.academic_year.asc(),
                    semester_order.asc(),
                    Enrollment.year_level.asc(),
                )
                .first()
            )
            last_row = (
                EnrollmentRepository(db)
                .query_with(Enrollment.semester, Enrollment.academic_year)
                .filter(Enrollment.student_id == sr_code)
                .order_by(
                    Enrollment.academic_year.desc(),
                    semester_order.desc(),
                    Enrollment.year_level.desc(),
                )
                .first()
            )

            if not first_row or not last_row:
                return (
                    default_semester,
                    default_academic_year,
                    default_semester,
                    default_academic_year,
                )

            return (
                str(first_row.semester or default_semester),
                str(first_row.academic_year or default_academic_year),
                str(last_row.semester or default_semester),
                str(last_row.academic_year or default_academic_year),
            )
        finally:
            db.close()
