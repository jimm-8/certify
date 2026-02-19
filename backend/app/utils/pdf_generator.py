from reportlab.lib.pagesizes import letter
from reportlab.lib.units import inch
from reportlab.lib import colors
from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer, Image
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.enums import TA_CENTER, TA_LEFT, TA_RIGHT
from reportlab.pdfgen import canvas
import qrcode
import os
from datetime import datetime
from io import BytesIO


class CertificateGenerator:
    """
    Generates PDF certificates using Letter size (8.5 x 11 inches)
    """

    def __init__(self, output_dir="uploads/certificates"):
        self.output_dir = output_dir
        os.makedirs(output_dir, exist_ok=True)

    def generate_qr_code(self, verification_token: str) -> str:
        """Generate QR code for certificate verification. Returns path to image."""
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

    def _add_signature_line(self, c, x_pos, y_pos, width, title):
        """Draw a simple signature block with a placeholder line and title."""
        c.setLineWidth(1)
        c.line(x_pos, y_pos, x_pos + width, y_pos)
        c.setFont("Helvetica-Bold", 10)
        c.drawCentredString(x_pos + width / 2, y_pos - 15, "SIGNATURE HERE")
        c.setFont("Helvetica", 9)
        c.drawCentredString(x_pos + width / 2, y_pos - 28, title)

    def _add_signature_to_pdf(self, canvas_obj, signature_data, x_pos, y_pos, width=150):
        """
        Add a signature image (if available) plus name/title block to the PDF.

        Args:
            canvas_obj:     ReportLab canvas object
            signature_data: dict with keys 'file_path', 'name', 'title', 'position'
            x_pos:          X position (left edge of signature block)
            y_pos:          Y position (baseline of signature line)
            width:          Width of the signature block
        """
        file_path = signature_data.get('file_path')
        name  = signature_data.get('name',  'Authorized Signatory')
        title = signature_data.get('title', 'Official')

        if file_path and os.path.exists(file_path):
            try:
                canvas_obj.drawImage(
                    file_path, x_pos, y_pos + 10,
                    width=width, height=50,
                    preserveAspectRatio=True, mask='auto'
                )
            except Exception as e:
                print(f"Could not add signature image: {e}")

        canvas_obj.setStrokeColor(colors.black)
        canvas_obj.setLineWidth(1)
        canvas_obj.line(x_pos, y_pos, x_pos + width, y_pos)
        canvas_obj.setFont("Helvetica-Bold", 11)
        canvas_obj.drawCentredString(x_pos + width / 2, y_pos - 20, name)
        canvas_obj.setFont("Helvetica", 9)
        canvas_obj.drawCentredString(x_pos + width / 2, y_pos - 35, title)

    def generate_certificate(
        self,
        certificate_data: dict,
        filename: str = None
    ) -> str:
        """
        Generate a PDF certificate on Letter size paper.

        certificate_data keys:
          - student_name       (str)
          - program            (str)
          - major              (str, optional)
          - certificate_type   (str)
          - reference_number   (str)
          - issue_date         (str, optional — defaults to today)
          - purpose            (str, optional)
          - year_graduated     (str, optional — for Certificate of Graduation)
          - verification_token (str, optional — enables QR code)
          - signatures         (list of dicts, optional)
              Each dict: { 'file_path': str, 'name': str, 'title': str,
                           'position': 'left'|'center'|'right' }
        """

        # Filename
        if not filename:
            timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
            ref_num = certificate_data.get('reference_number', 'CERT')
            filename = f"{ref_num}_{timestamp}.pdf"

        filepath = os.path.join(self.output_dir, filename)

        # Canvas
        c = canvas.Canvas(filepath, pagesize=letter)
        width, height = letter  # 612 x 792 points
        print(f"📄 Generating Letter size certificate: {width} x {height} points")

        # Extract all fields
        student_name       = certificate_data.get('student_name',      'N/A')
        program            = certificate_data.get('program',            'N/A')
        major              = certificate_data.get('major',              '')
        certificate_type   = certificate_data.get('certificate_type',   'Certificate')
        reference_number   = certificate_data.get('reference_number',   'N/A')
        issue_date         = certificate_data.get('issue_date',         datetime.now().strftime('%B %d, %Y'))
        purpose            = certificate_data.get('purpose',            'For whatever legal purpose it may serve')
        verification_token = certificate_data.get('verification_token')
        signatures         = certificate_data.get('signatures',         [])

        # ── HEADER ────────────────────────────────────────────────────────────
        header_y = height - 70
        c.setFont("Helvetica-Bold", 18)
        c.drawCentredString(width / 2, header_y, "BATANGAS STATE UNIVERSITY")
        c.setFont("Helvetica", 11)
        c.drawCentredString(width / 2, header_y - 20, "Office of the Registrar")
        c.drawCentredString(width / 2, header_y - 35, "Alangilan, Batangas City")
        c.setStrokeColor(colors.HexColor("#0066cc"))
        c.setLineWidth(2)
        c.line(100, header_y - 50, width - 100, header_y - 50)

        # ── TITLE ─────────────────────────────────────────────────────────────
        title_y = header_y - 90
        c.setFont("Helvetica-Bold", 20)
        c.setFillColor(colors.HexColor("#0066cc"))
        c.drawCentredString(width / 2, title_y, certificate_type.upper())
        c.setFillColor(colors.black)

        # ── BODY ──────────────────────────────────────────────────────────────
        body_y = title_y - 50
        c.setFont("Helvetica", 12)
        c.drawCentredString(width / 2, body_y, "This is to certify that")

        # Student name + underline
        body_y -= 35
        c.setFont("Helvetica-Bold", 16)
        c.drawCentredString(width / 2, body_y, student_name.upper())
        name_width = c.stringWidth(student_name.upper(), "Helvetica-Bold", 16)
        c.line(
            (width / 2) - (name_width / 2) - 10, body_y - 5,
            (width / 2) + (name_width / 2) + 10, body_y - 5
        )

        # Program + optional major
        body_y -= 35
        c.setFont("Helvetica", 12)
        program_text = f"is enrolled in the program of {program}"
        if major:
            program_text += f", Major in {major}"
        c.drawCentredString(width / 2, body_y, program_text)

        # Certificate-type-specific line
        body_y -= 30
        if certificate_type == "Certificate of Enrolment":
            c.drawCentredString(width / 2, body_y, f"for the Academic Year {datetime.now().year}")
        elif certificate_type == "Certificate of Graduation":
            year_grad = certificate_data.get('year_graduated', 'N/A')
            c.drawCentredString(width / 2, body_y, f"and graduated in {year_grad}")

        # Purpose
        body_y -= 40
        c.setFont("Helvetica-Oblique", 11)
        c.drawString(100, body_y, f"Purpose: {purpose}")

        # Issue date + reference number
        body_y -= 60
        c.setFont("Helvetica", 10)
        c.drawString(100, body_y,       f"Issued on: {issue_date}")
        c.drawString(100, body_y - 15,  f"Reference No: {reference_number}")

        # ── SIGNATURES ────────────────────────────────────────────────────────
        sig_y = 200

        if signatures:
            num_sigs = len(signatures)
            if num_sigs == 1:
                sig   = signatures[0]
                x_pos = (width - 250) if sig.get('position') == 'right' else (width / 2 - 75)
                self._add_signature_to_pdf(c, sig, x_pos, sig_y, width=150)
            elif num_sigs == 2:
                for i, sig in enumerate(signatures):
                    x_pos = 120 if i == 0 else width - 270
                    self._add_signature_to_pdf(c, sig, x_pos, sig_y, width=150)
            else:   # 3+ — cap at 3
                positions = [120, width / 2 - 75, width - 270]
                for i, sig in enumerate(signatures[:3]):
                    self._add_signature_to_pdf(c, sig, positions[i], sig_y, width=150)
        else:
            # Fallback plain lines
            self._add_signature_line(c, 100,         sig_y, 150, "VERIFIED BY")
            self._add_signature_line(c, width - 250, sig_y, 150, "REGISTRAR")

        # ── QR CODE ───────────────────────────────────────────────────────────
        if verification_token:
            try:
                qr_path = self.generate_qr_code(verification_token)
                c.drawImage(qr_path, 40, 40, width=100, height=100)
                c.setFont("Helvetica", 7)
                c.drawString(50, 35, "Scan to verify")
            except Exception as e:
                print(f"⚠️  Could not add QR code: {e}")

        # ── FOOTER ────────────────────────────────────────────────────────────
        c.setFont("Helvetica-Oblique", 8)
        c.setFillColor(colors.grey)
        c.drawCentredString(
            width / 2, 30,
            "This is a computer-generated certificate. Authentication can be verified via QR code."
        )

        # ── BORDER ────────────────────────────────────────────────────────────
        c.setStrokeColor(colors.HexColor("#0066cc"))
        c.setLineWidth(3)
        c.rect(30, 30, width - 60, height - 60, fill=0)

        c.save()
        print(f"✅ Certificate generated: {filepath}")
        return filepath

    def generate_simple_certificate(
        self,
        student_name: str,
        certificate_type: str,
        program: str,
        reference_number: str
    ) -> str:
        """Quick method to generate a basic certificate with minimal data."""
        certificate_data = {
            'student_name':     student_name,
            'certificate_type': certificate_type,
            'program':          program,
            'reference_number': reference_number,
            'issue_date':       datetime.now().strftime('%B %d, %Y'),
        }
        return self.generate_certificate(certificate_data)