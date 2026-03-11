"""Render a single template to PDF for debugging CSS/rendering issues.

Usage:
  python -m app.scripts.test_pdf_render
"""
from app.utils.template_engine import CertificateTemplateEngine
from app.utils.pdf_generator import CertificateGenerator
from pathlib import Path


def run():
    engine = CertificateTemplateEngine()
    gen = CertificateGenerator(output_dir="uploads/cert_test")

    template_name = "Cert-of-Completed-Acad-Req.html"
    tpl_path = engine.resolve_template_path(template_name, {})
    context = {
        "student_sex": "Male",
        "student_honorific": "Mr.",
        "student_name": "Juan Dela Cruz",
        "year_level": "3rd",
        "program": "BS Computer Science",
        "college_name": "College of Informatics and Computing Sciences",
        "semester": "1st",
        "academic_year": "2025-2026",
        "enrollment_from_semester": "1st",
        "enrollment_from_academic_year": "2023-2024",
        "enrollment_to_semester": "2nd",
        "enrollment_to_academic_year": "2024-2025",
        "enrollment_is_single_semester": True,
        "requestor_name": "Juan Dela Cruz",
        "requestor_relationship": "Self",
        "issuance_day": "10",
        "issuance_month": "March",
        "issuance_year": "2026",
        "purpose_of_request": "Scholarship",
        "campus_name": "Alangilan Campus",
        "campus_address": "Golden Country Homes, Alangilan, Batangas City, Batangas, Philippines, 4200",
        "campus_contact": "(+63) 43 425 0139 local 2149",
        "campus_email": "registrar.alangilan@g.batstate-u.edu.ph",
        "school_website": "batstate-u.edu.ph",
        "legacy_fill_values": [],
    }

    rendered = engine.render_template(tpl_path, context)
    out = gen.generate_certificate({
        "rendered_html": rendered,
        "template_base_path": str(tpl_path.parent),
        "reference_number": "TESTPDF",
        "source_template": tpl_path.name,
    })
    print("PDF written to:", out)


if __name__ == "__main__":
    run()
