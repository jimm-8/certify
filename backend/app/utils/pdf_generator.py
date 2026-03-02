from __future__ import annotations
import os
from datetime import datetime
import qrcode
from reportlab.lib import colors
from reportlab.lib.pagesizes import letter
from reportlab.pdfgen import canvas


class CertificateGenerator:
    """Generates certificate PDFs on Letter size paper."""

    def __init__(self, output_dir: str = "uploads/certificates"):
        self.output_dir = output_dir
        os.makedirs(output_dir, exist_ok=True)

    def generate_qr_code(self, verification_token: str) -> str:
        qr = qrcode.QRCode(
            version=1,
            error_correction=qrcode.constants.ERROR_CORRECT_L,
            box_size=10,
            border=4,
        )
        verify_url = f"http://localhost:8000/api/v1/requests/verify/{verification_token}"
        qr.add_data(verify_url)
        qr.make(fit=True)

        img = qr.make_image(fill_color="black", back_color="white")

        qr_dir = "uploads/qrcodes"
        os.makedirs(qr_dir, exist_ok=True)
        qr_path = os.path.join(qr_dir, f"qr_{verification_token[:20]}.png")
        img.save(qr_path)
        return qr_path

    def _add_signature_line(self, c: canvas.Canvas, x_pos: float, y_pos: float, width: float, title: str) -> None:
        c.setLineWidth(1)
        c.line(x_pos, y_pos, x_pos + width, y_pos)
        c.setFont("Helvetica-Bold", 10)
        c.drawCentredString(x_pos + width / 2, y_pos - 15, "SIGNATURE HERE")
        c.setFont("Helvetica", 9)
        c.drawCentredString(x_pos + width / 2, y_pos - 28, title)

    def _add_signature_to_pdf(self, c: canvas.Canvas, signature_data: dict, x_pos: float, y_pos: float, width: float = 150) -> None:
        file_path = signature_data.get("file_path")
        name = signature_data.get("name", "Authorized Signatory")
        title = signature_data.get("title", "Official")

        if file_path and os.path.exists(file_path):
            try:
                c.drawImage(
                    file_path,
                    x_pos,
                    y_pos + 10,
                    width=width,
                    height=50,
                    preserveAspectRatio=True,
                    mask="auto",
                )
            except Exception as exc:
                print(f"Could not add signature image: {exc}")

        c.setStrokeColor(colors.black)
        c.setLineWidth(1)
        c.line(x_pos, y_pos, x_pos + width, y_pos)
        c.setFont("Helvetica-Bold", 11)
        c.drawCentredString(x_pos + width / 2, y_pos - 20, name)
        c.setFont("Helvetica", 9)
        c.drawCentredString(x_pos + width / 2, y_pos - 35, title)

    def _draw_wrapped_lines(
        self,
        c: canvas.Canvas,
        lines: list[str],
        x: float,
        start_y: float,
        max_width: float,
        font_name: str = "Helvetica",
        font_size: int = 12,
        line_gap: float = 16,
    ) -> float:
        c.setFont(font_name, font_size)
        y = start_y

        for line in lines:
            words = line.split()
            if not words:
                y -= line_gap
                continue

            current = words[0]
            for word in words[1:]:
                candidate = f"{current} {word}"
                if c.stringWidth(candidate, font_name, font_size) <= max_width:
                    current = candidate
                else:
                    c.drawString(x, y, current)
                    y -= line_gap
                    current = word
            c.drawString(x, y, current)
            y -= line_gap

        return y

    def generate_certificate(self, certificate_data: dict, filename: str | None = None) -> str:
        if not filename:
            timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
            ref_num = certificate_data.get("reference_number", "CERT")
            filename = f"{ref_num}_{timestamp}.pdf"

        filepath = os.path.join(self.output_dir, filename)

        c = canvas.Canvas(filepath, pagesize=letter)
        width, height = letter

        reference_number = certificate_data.get("reference_number", "N/A")
        issue_date = certificate_data.get("issue_date", datetime.now().strftime("%B %d, %Y"))
        purpose = certificate_data.get("purpose", "For whatever legal purpose it may serve")
        verification_token = certificate_data.get("verification_token")
        signatures = certificate_data.get("signatures", [])
        template_header_lines = certificate_data.get("template_header_lines", [])
        template_title = certificate_data.get("template_title")
        template_body_lines = certificate_data.get("template_body_lines", [])
        template_footer = certificate_data.get("template_footer", "")
        source_template = certificate_data.get("source_template")

        if not source_template:
            raise ValueError("Template-driven generation requires source_template")
        if not template_title:
            raise ValueError("Template-driven generation requires template_title from HTML template")
        if not template_body_lines:
            raise ValueError("Template-driven generation requires template_body_lines from HTML template")

        header_y = height - 70
        if template_header_lines:
            c.setFont("Helvetica-Bold", 12)
            c.drawCentredString(width / 2, header_y, template_header_lines[0])
            running_y = header_y - 16
            for idx, line in enumerate(template_header_lines[1:], start=1):
                if idx == 1:
                    c.setFont("Helvetica-Bold", 16)
                elif idx == 2:
                    c.setFont("Helvetica-Bold", 12)
                else:
                    c.setFont("Helvetica", 10)
                c.drawCentredString(width / 2, running_y, line)
                running_y -= 14
            header_line_y = running_y - 4
        else:
            header_line_y = header_y - 50
        c.setStrokeColor(colors.HexColor("#0066cc"))
        c.setLineWidth(2)
        c.line(100, header_line_y, width - 100, header_line_y)

        title_y = header_line_y - 40
        c.setFont("Helvetica-Bold", 19)
        c.setFillColor(colors.HexColor("#0066cc"))
        c.drawCentredString(width / 2, title_y, template_title.upper())
        c.setFillColor(colors.black)

        body_y = title_y - 45
        body_y = self._draw_wrapped_lines(
            c,
            template_body_lines,
            x=70,
            start_y=body_y,
            max_width=width - 140,
            font_name="Helvetica",
            font_size=11,
            line_gap=15,
        )

        info_y = 150
        c.setFont("Helvetica", 10)
        c.drawString(70, info_y + 35, f"Issued on: {issue_date}")
        c.drawString(70, info_y + 20, f"Reference No: {reference_number}")
        c.drawString(70, info_y + 5, f"Purpose: {purpose}")
        if source_template:
            c.setFont("Helvetica-Oblique", 8)
            c.drawString(70, info_y - 10, f"Template: {source_template}")

        sig_y = 200
        if signatures:
            if len(signatures) == 1:
                sig = signatures[0]
                x_pos = (width - 250) if sig.get("position") == "right" else (width / 2 - 75)
                self._add_signature_to_pdf(c, sig, x_pos, sig_y, width=150)
            elif len(signatures) == 2:
                for i, sig in enumerate(signatures):
                    x_pos = 120 if i == 0 else width - 270
                    self._add_signature_to_pdf(c, sig, x_pos, sig_y, width=150)
            else:
                positions = [120, width / 2 - 75, width - 270]
                for i, sig in enumerate(signatures[:3]):
                    self._add_signature_to_pdf(c, sig, positions[i], sig_y, width=150)
        else:
            self._add_signature_line(c, 100, sig_y, 150, "VERIFIED BY")
            self._add_signature_line(c, width - 250, sig_y, 150, "REGISTRAR")

        if verification_token:
            try:
                qr_path = self.generate_qr_code(verification_token)
                c.drawImage(qr_path, 40, 40, width=100, height=100)
                c.setFont("Helvetica", 7)
                c.drawString(50, 35, "Scan to verify")
            except Exception as exc:
                print(f"Could not add QR code: {exc}")

        c.setFont("Helvetica-Oblique", 8)
        c.setFillColor(colors.grey)
        c.drawCentredString(width / 2, 30, template_footer or "")

        c.setStrokeColor(colors.HexColor("#0066cc"))
        c.setLineWidth(3)
        c.rect(30, 30, width - 60, height - 60, fill=0)

        c.save()
        return filepath

    def generate_simple_certificate(
        self,
        student_name: str,
        certificate_type: str,
        program: str,
        reference_number: str,
    ) -> str:
        certificate_data = {
            "student_name": student_name,
            "certificate_type": certificate_type,
            "program": program,
            "reference_number": reference_number,
            "issue_date": datetime.now().strftime("%B %d, %Y"),
        }
        return self.generate_certificate(certificate_data)
