from reportlab.lib.pagesizes import letter  # CHANGED FROM A4
from reportlab.lib.units import inch
from reportlab.lib import colors
from reportlab.pdfgen import canvas
import qrcode
import os
from datetime import datetime

class CertificateGenerator:
    """
    Generates PDF certificates using Letter size (8.5 x 11 inches)
    """
    
    def __init__(self, output_dir="uploads/certificates"):
        self.output_dir = output_dir
        os.makedirs(output_dir, exist_ok=True)
    
    def generate_certificate(
        self,
        certificate_data: dict,
        filename: str = None
    ) -> str:
        """
        Generate a PDF certificate on Letter size paper
        """
        
        # Generate filename
        if not filename:
            timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
            ref_num = certificate_data.get('reference_number', 'CERT')
            filename = f"{ref_num}_{timestamp}.pdf"
        
        filepath = os.path.join(self.output_dir, filename)
        
        # Create PDF with LETTER size
        c = canvas.Canvas(filepath, pagesize=letter)
        width, height = letter  # 612 x 792 points
        
        print(f"📄 Generating Letter size certificate: {width} x {height} points")
        
        # Get data
        student_name = certificate_data.get('student_name', 'N/A')
        program = certificate_data.get('program', 'N/A')
        certificate_type = certificate_data.get('certificate_type', 'Certificate')
        reference_number = certificate_data.get('reference_number', 'N/A')
        verification_token = certificate_data.get('verification_token')
        
        # ===== HEADER =====
        header_y = height - 70
        
        c.setFont("Helvetica-Bold", 18)
        c.drawCentredString(width / 2, header_y, "BATANGAS STATE UNIVERSITY")
        
        c.setFont("Helvetica", 11)
        c.drawCentredString(width / 2, header_y - 20, "Office of the Registrar")
        c.drawCentredString(width / 2, header_y - 35, "Alangilan, Batangas City")
        
        # Decorative line
        c.setStrokeColor(colors.HexColor("#0066cc"))
        c.setLineWidth(2)
        c.line(100, header_y - 50, width - 100, header_y - 50)
        
        # ===== TITLE =====
        title_y = header_y - 90
        c.setFont("Helvetica-Bold", 20)
        c.setFillColor(colors.HexColor("#0066cc"))
        c.drawCentredString(width / 2, title_y, certificate_type.upper())
        c.setFillColor(colors.black)
        
        # ===== BODY =====
        body_y = title_y - 50
        c.setFont("Helvetica", 12)
        c.drawCentredString(width / 2, body_y, "This is to certify that")
        
        # Student name
        body_y -= 35
        c.setFont("Helvetica-Bold", 16)
        c.drawCentredString(width / 2, body_y, student_name.upper())
        
        # Underline name
        name_width = c.stringWidth(student_name.upper(), "Helvetica-Bold", 16)
        c.line(
            (width / 2) - (name_width / 2) - 10,
            body_y - 5,
            (width / 2) + (name_width / 2) + 10,
            body_y - 5
        )
        
        # Program info
        body_y -= 35
        c.setFont("Helvetica", 12)
        c.drawCentredString(
            width / 2, 
            body_y, 
            f"is enrolled in the program of {program}"
        )
        
        # ===== SIGNATURES =====
        sig_y = 180
        
        # Left signature
        self._add_signature_line(c, 100, sig_y, 150, "VERIFIED BY")
        
        # Right signature  
        self._add_signature_line(c, width - 250, sig_y, 150, "REGISTRAR")
        
        # ===== QR CODE =====
        if verification_token:
            try:
                qr_path = self.generate_qr_code(verification_token)
                c.drawImage(qr_path, 50, 50, width=70, height=70)
                c.setFont("Helvetica", 7)
                c.drawString(50, 35, "Scan to verify")
            except Exception as e:
                print(f"⚠️  Could not add QR code: {e}")
        
        # ===== FOOTER =====
        c.setFont("Helvetica-Oblique", 8)
        c.setFillColor(colors.grey)
        c.drawCentredString(
            width / 2,
            40,
            "This is a computer-generated certificate."
        )
        
        # ===== BORDER =====
        c.setStrokeColor(colors.HexColor("#0066cc"))
        c.setLineWidth(3)
        c.rect(30, 30, width - 60, height - 60, fill=0)
        
        c.save()
        
        print(f"✅ Certificate generated: {filepath}")
        return filepath
    
    def _add_signature_line(self, c, x_pos, y_pos, width, title):
        """Helper to draw signature block"""
        # Line
        c.setLineWidth(1)
        c.line(x_pos, y_pos, x_pos + width, y_pos)
        
        # Name
        c.setFont("Helvetica-Bold", 10)
        c.drawCentredString(x_pos + width/2, y_pos - 15, "SIGNATURE HERE")
        
        # Title
        c.setFont("Helvetica", 9)
        c.drawCentredString(x_pos + width/2, y_pos - 28, title)
    
    def generate_qr_code(self, verification_token: str) -> str:
        """Generate QR code (same as before)"""
        qr = qrcode.QRCode(version=1, box_size=10, border=4)
        verify_url = f"http://localhost:8000/api/v1/requests/verify/{verification_token}"
        qr.add_data(verify_url)
        qr.make(fit=True)
        
        img = qr.make_image(fill_color="black", back_color="white")
        
        qr_dir = "uploads/qrcodes"
        os.makedirs(qr_dir, exist_ok=True)
        qr_path = os.path.join(qr_dir, f"qr_{verification_token[:20]}.png")
        img.save(qr_path)
        
        return qr_path