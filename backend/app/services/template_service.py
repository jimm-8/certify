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
            "legacy_fill_values": [
                request.student_name,
                request.program,
                request.major,
                request.sr_code,
                request.year_graduated,
                request.requestor_name,
                str(now.day),
                month_text,
                request.purpose,
                f"{now.year}-{now.year + 1}",
                request.reference_number,
            ],
        }
