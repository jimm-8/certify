from __future__ import annotations

from datetime import datetime
from typing import Any

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
        day = context["day"]
        month = context["month"]
        semester = context["semester"]
        academic_year = context["academic_year"]
        ay_start, ay_end = self._split_academic_year(academic_year)

        student_name = request.student_name or ""
        program = request.program or ""
        major = request.major or ""
        requestor_name = request.requestor_name or ""
        purpose = request.purpose or ""
        year_graduated = request.year_graduated or ""
        sr_code = request.sr_code or ""
        ref_number = request.reference_number or ""

        by_template: dict[str, list[str]] = {
            "Cert-of-Enrollment-Current.html": [
                student_name, major, program, major, semester, academic_year,
                requestor_name, day, month, purpose,
            ],
            "Cert-of-Enrollment-Previous.html": [
                student_name, program, major, semester, academic_year,
                semester, academic_year, semester, academic_year,
                requestor_name, day, month, purpose,
            ],
            "Cert-of-Grad-Has-Graduated.html": [
                student_name, program, year_graduated, ref_number,
                requestor_name, day, month,
            ],
            "Cert-of-Grad-CandidateforGrad.html": [
                student_name, program, semester, academic_year, day, month,
            ],
            "Cert-of-Grades.html": [
                student_name, program, major, semester, academic_year,
                semester, academic_year, semester, academic_year,
                requestor_name, day, month,
            ],
            "Cert-of-ID-Issuance-Current.html": [
                student_name, semester, academic_year, sr_code, day, month, requestor_name,
            ],
            "Cert-of-ID-Issuance-Previous.html": [
                student_name, semester, semester, sr_code, day, month, requestor_name,
            ],
            "Cert-of-NSTP-Serial-Num.html": [
                student_name, program, sr_code, requestor_name, day, month,
            ],
            "Cert-of-Course-Desc.html": [
                student_name, program, semester, ay_start, ay_end, semester, ay_start, ay_end,
                program, ay_start, ay_end, "", "", "", "", requestor_name, day, month, purpose,
            ],
        }

        values = by_template.get(
            template_path.name,
            [student_name, program, major, sr_code, year_graduated, requestor_name, day, month, purpose, academic_year, ref_number],
        )

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
