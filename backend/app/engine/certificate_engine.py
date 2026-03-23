import os

from app.utils.qr_generator import generate_qr_base64


class CertificateEngine:
    TYPE_NAME_ALIASES = {
        "certificate of course description": "CERTIFICATE_OF_COURSE_DESCRIPTION",
        "certificate of enrolment": "CERTIFICATE_OF_ENROLLMENT",
        "certificate of enrollment": "CERTIFICATE_OF_ENROLLMENT",
        "certificate of grading system": "CERTIFICATION_OF_GRADES",
        "certificate of graduation": "CERTIFICATE_OF_GRADUATION",
        "certificate of id issuance": "CERTIFICATE_OF_ID_ISSUANCE",
        "certificate of nstp serial number": "CERTIFICATE_OF_NSTP_SERIAL_NUMBER",
        "certificate of transfer credentials": "CERTIFICATE_OF_TRANSFER_CREDENTIALS",
        "certification of completed academic requirements": "CERTIFICATE_OF_COMPLETED_ACAD_REQUIREMENTS",
        "certification of earned units": "CERTIFICATE_OF_EARNED_UNITS",
        "certification of english medium": "CERTIFICATE_OF_ENGLISH_MEDIUM",
        "certification of gwa": "CERTIFICATE_OF_GWA",
        "certification of grades": "CERTIFICATION_OF_GRADES",
        "certification of honor graduate": "CERTIFICATE_OF_HONOR_GRADUATE",
        "certification authentication and verification (cav)": "CERTIFICATION_AUTHENTICATION_AND_VERIFICATION",
    }

    TEMPLATE_MAP = {
        "CERTIFICATION_AUTHENTICATION_AND_VERIFICATION": "certification_authentication_and_verification.html",
        "CERTIFICATE_OF_GRADUATION_V1": "certificate_of_graduation_v1.html",
        "CERTIFICATE_OF_GRADUATION_V2": "certificate_of_graduation_v2.html",
        "CERTIFICATE_OF_ENROLLMENT_V1": "certificate_of_enrollment_v1.html",
        "CERTIFICATE_OF_ENROLLMENT_V2": "certificate_of_enrollment_v2.html",
        "CERTIFICATE_OF_EARNED_UNITS": "certificate_of_earned_units.html",
        "CERTIFICATE_OF_ENGLISH_MEDIUM_V1": "certificate_of_english_medium_v1.html",
        "CERTIFICATE_OF_ENGLISH_MEDIUM_V2": "certificate_of_english_medium_v2.html",
        "CERTIFICATE_OF_COMPLETED_ACAD_REQUIREMENTS": "certificate_of_completed_acad_requirements.html",
        "CERTIFICATE_OF_HONOR_GRADUATE": "certificate_of_honor_graduate.html",
        "CERTIFICATE_OF_COURSE_DESCRIPTION": "certificate_of_course_description.html",
        "CERTIFICATE_OF_ID_ISSUANCE_V1": "certificate_of_id_issuance_v1.html",
        "CERTIFICATE_OF_ID_ISSUANCE_V2": "certificate_of_id_issuance_v2.html",
        "CERTIFICATE_OF_NSTP_SERIAL_NUMBER": "certificate_of_nstp_serial_number.html",
        "CERTIFICATE_OF_GWA": "certificate_of_gwa.html",
        "CERTIFICATE_OF_TRANSFER_CREDENTIALS": "certificate_of_transfer_credentials.html",
        "CERTIFICATION_OF_GRADES": "certificate_of_grades.html",
    }

    TEMPLATE_DIR = os.path.abspath(
        os.path.join(os.path.dirname(__file__), "..", "templates")
    )

    @staticmethod
    def generate(certificate_type: str, data: dict):
        """
        Generates a PDF certificate from HTML template
        """
        from jinja2 import Environment, FileSystemLoader, select_autoescape
        from io import BytesIO
        from xhtml2pdf import pisa

        # ----------------------------------------
        # 1. LOAD TEMPLATE
        # ----------------------------------------
        template_key = CertificateEngine._resolve_certificate_key(certificate_type, data)
        template_name = CertificateEngine.TEMPLATE_MAP.get(template_key)

        if not template_name:
            raise Exception("Template not found for certificate type")

        env = Environment(
            loader=FileSystemLoader(CertificateEngine.TEMPLATE_DIR),
            autoescape=select_autoescape(["html", "xml"])
        )

        template = env.get_template(template_name)

        # ----------------------------------------
        # 2. GENERATE QR CODE (BASE64)
        # ----------------------------------------
        verification_code = data.get("verification_code")

        if verification_code:
            verify_url = f"http://localhost:8000/certificates/verify/{verification_code}"
            qr_base64 = generate_qr_base64(verify_url)
            data["qr_code"] = qr_base64

        # ----------------------------------------
        # 3. RENDER HTML
        # ----------------------------------------
        html_content = template.render(**data)

        # ----------------------------------------
        # 4. GENERATE PDF
        # ----------------------------------------
        try:
            from weasyprint import HTML
            return HTML(string=html_content).write_pdf()
        except Exception:
            # Fallback to xhtml2pdf for environments where WeasyPrint deps are missing.
            output = BytesIO()
            result = pisa.CreatePDF(src=html_content, dest=output)
            if result.err:
                raise Exception("Failed to generate PDF with WeasyPrint and xhtml2pdf")
            return output.getvalue()

    @staticmethod
    def _resolve_certificate_key(certificate_type: str, data: dict) -> str:
        if certificate_type in CertificateEngine.TEMPLATE_MAP:
            return certificate_type
        normalized = (certificate_type or "").strip().lower()
        resolved = CertificateEngine.TYPE_NAME_ALIASES.get(normalized, certificate_type)
        return CertificateEngine._resolve_versioned_key(resolved, data)

    @staticmethod
    def _resolve_versioned_key(base_key: str, data: dict) -> str:
        if base_key in CertificateEngine.TEMPLATE_MAP:
            return base_key

        key = base_key or ""
        has_v1 = f"{key}_V1" in CertificateEngine.TEMPLATE_MAP
        has_v2 = f"{key}_V2" in CertificateEngine.TEMPLATE_MAP
        if not (has_v1 or has_v2):
            return base_key

        is_graduated = bool(data.get("year_graduated") or data.get("is_graduated"))
        preferred = f"{key}_V2" if is_graduated else f"{key}_V1"

        if preferred in CertificateEngine.TEMPLATE_MAP:
            return preferred
        if has_v2:
            return f"{key}_V2"
        if has_v1:
            return f"{key}_V1"
        return base_key
