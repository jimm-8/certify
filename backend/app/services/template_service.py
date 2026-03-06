from __future__ import annotations

from datetime import datetime
from typing import Any

from app.certificate_dependencies import DEFAULT_FILL_DEPENDENCIES, TEMPLATE_FILL_DEPENDENCIES
from app.utils.pdf_generator import CertificateGenerator
from app.utils.template_engine import CertificateTemplateEngine


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
            "semester": "1st",
            "academic_year": f"{now.year}-{now.year + 1}",
            "campus_name": "Alangilan Campus",
            "campus_address": "Golden Country Homes, Alangilan, Batangas City",
            "campus_contact": "(+63) 43 425 0139",
            "campus_email_website": "registrar@g.batstate-u.edu.ph | batstate-u.edu.ph",
            "legacy_fill_values": [],
        }

    def _build_legacy_fill_values(self, request, context: dict[str, Any], template_path) -> list[str]:
        semester = context["semester"]
        academic_year = context["academic_year"]
        ay_start, ay_end = self._split_academic_year(academic_year)

        values_by_dependency = {
            "student_name": request.student_name or "",
            "program": request.program or "",
            "major": request.major or "",
            "degree": request.program or "",
            "college_name": request.major or "",
            "year_level": request.major or "",
            "requestor_name": request.requestor_name or "",
            "purpose_of_request": request.purpose or "",
            "date_of_graduation": request.year_graduated or "",
            "id_number": request.sr_code or "",
            "nstp_serial_number": request.sr_code or "",
            "nstp_component": request.program or "",
            "board_resolution_number": request.reference_number or "",
            "academic_year": academic_year,
            "academic_year_start": ay_start,
            "academic_year_end": ay_end,
            "semester": semester,
            "issuance_day": context["day"],
            "issuance_month": context["month"],
            "course_code_all": "",
            "credits_all": "",
        }

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
