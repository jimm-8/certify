from reportlab.lib.pagesizes import letter, A4
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
    Generates PDF certificates with student data
    """
    
    def __init__(self, output_dir="uploads/certificates"):
        self.output_dir = output_dir
        # Create directory if it doesn't exist
        os.makedirs(output_dir, exist_ok=True)
    
    def generate_qr_code(self, verification_token: str) -> str:
        """
        Generate QR code for certificate verification
        Returns: path to QR code image
        """
        # Create QR code
        qr = qrcode.QRCode(
            version=1,
            error_correction=qrcode.constants.ERROR_CORRECT_L,
            box_size=10,
            border=4,
        )
        
        # Add verification URL
        verify_url = f"http://localhost:8000/api/v1/requests/verify/{verification_token}"
        qr.add_data(verify_url)
        qr.make(fit=True)
        
        # Create image
        img = qr.make_image(fill_color="black", back_color="white")
        
        # Save to file
        qr_dir = "uploads/qrcodes"
        os.makedirs(qr_dir, exist_ok=True)
        qr_path = os.path.join(qr_dir, f"qr_{verification_token[:20]}.png")
        img.save(qr_path)
        
        return qr_path
    
    def _add_signature_to_pdf(self, canvas_obj, signature_data, x_pos, y_pos, width=150):
        """
        Helper method to add a signature to the PDF
        
        Args:
            canvas_obj: ReportLab canvas object
            signature_data: Dictionary with signature info
            x_pos: X position
            y_pos: Y position  
            width: Signature width
        """
        from reportlab.lib import colors
        
        # Get signature details
        file_path = signature_data.get('file_path')
        name = signature_data.get('name', 'Authorized Signatory')
        title = signature_data.get('title', 'Official')
        
        # Add signature image if exists
        if file_path and os.path.exists(file_path):
            try:
                canvas_obj.drawImage(
                    file_path,
                    x_pos,
                    y_pos + 10,
                    width=width,
                    height=50,
                    preserveAspectRatio=True,
                    mask='auto'
                )
            except Exception as e:
                print(f"Could not add signature image: {e}")
        
        # Add signature line
        canvas_obj.setStrokeColor(colors.black)
        canvas_obj.setLineWidth(1)
        canvas_obj.line(x_pos, y_pos, x_pos + width, y_pos)
        
        # Add name and title
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
        Generate a PDF certificate
        
        Args:
            certificate_data: Dictionary containing all certificate information
            filename: Optional custom filename
        
        Returns:
            Path to generated PDF file
        """
        
        # Generate filename if not provided
        if not filename:
            timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
            ref_num = certificate_data.get('reference_number', 'CERT')
            filename = f"{ref_num}_{timestamp}.pdf"
        
        # Full path
        filepath = os.path.join(self.output_dir, filename)
        
        # Create PDF
        c = canvas.Canvas(filepath, pagesize=A4)
        width, height = A4
        
        # Get data
        student_name = certificate_data.get('student_name', 'N/A')
        program = certificate_data.get('program', 'N/A')
        major = certificate_data.get('major', '')
        certificate_type = certificate_data.get('certificate_type', 'Certificate')
        reference_number = certificate_data.get('reference_number', 'N/A')
        issue_date = certificate_data.get('issue_date', datetime.now().strftime('%B %d, %Y'))
        verification_token = certificate_data.get('verification_token')
        
        # ===== HEADER =====
        # School Logo placeholder (you can add actual logo later)
        c.setFont("Helvetica-Bold", 20)
        c.drawCentredString(width / 2, height - 80, "YOUR SCHOOL NAME")
        
        c.setFont("Helvetica", 12)
        c.drawCentredString(width / 2, height - 100, "Address Line 1, City, Country")
        c.drawCentredString(width / 2, height - 115, "Tel: (123) 456-7890 | Email: registrar@school.edu")
        
        # Decorative line
        c.setStrokeColor(colors.HexColor("#0066cc"))
        c.setLineWidth(2)
        c.line(100, height - 130, width - 100, height - 130)
        
        # ===== TITLE =====
        c.setFont("Helvetica-Bold", 18)
        c.drawCentredString(width / 2, height - 170, "OFFICE OF THE REGISTRAR")
        
        c.setFont("Helvetica-Bold", 24)
        c.setFillColor(colors.HexColor("#0066cc"))
        c.drawCentredString(width / 2, height - 210, certificate_type.upper())
        c.setFillColor(colors.black)
        
        # ===== BODY =====
        c.setFont("Helvetica", 12)
        
        # Introduction text
        text_y = height - 260
        c.drawCentredString(width / 2, text_y, "This is to certify that")
        
        # Student name (highlighted)
        text_y -= 40
        c.setFont("Helvetica-Bold", 16)
        c.drawCentredString(width / 2, text_y, student_name.upper())
        
        # Draw underline under name
        name_width = c.stringWidth(student_name.upper(), "Helvetica-Bold", 16)
        c.line(
            (width / 2) - (name_width / 2) - 10,
            text_y - 5,
            (width / 2) + (name_width / 2) + 10,
            text_y - 5
        )
        
        # Program information
        text_y -= 40
        c.setFont("Helvetica", 12)
        program_text = f"is enrolled in the program of {program}"
        if major:
            program_text += f", Major in {major}"
        c.drawCentredString(width / 2, text_y, program_text)
        
        # Additional certificate-specific information
        text_y -= 30
        if certificate_type == "Certificate of Enrolment":
            c.drawCentredString(width / 2, text_y, f"for the Academic Year {datetime.now().year}")
        elif certificate_type == "Certificate of Graduation":
            year_grad = certificate_data.get('year_graduated', 'N/A')
            c.drawCentredString(width / 2, text_y, f"and graduated in {year_grad}")
        
        # Purpose
        text_y -= 40
        c.setFont("Helvetica-Oblique", 11)
        purpose = certificate_data.get('purpose', 'For whatever legal purpose it may serve')
        c.drawString(100, text_y, f"Purpose: {purpose}")
        
        # Issue date and reference
        text_y -= 60
        c.setFont("Helvetica", 10)
        c.drawString(100, text_y, f"Issued on: {issue_date}")
        c.drawString(100, text_y - 15, f"Reference No: {reference_number}")
        
        # ===== SIGNATURE SECTION =====
        sig_y = 200
        
        # Get signatures (we'll pass them in certificate_data)
        signatures = certificate_data.get('signatures', [])
        
        if signatures:
            # Calculate positions for signatures
            num_sigs = len(signatures)
            
            if num_sigs == 1:
                # Single signature - centered or right
                sig = signatures[0]
                x_pos = width - 200 if sig.get('position') == 'right' else width / 2 - 75
                self._add_signature_to_pdf(c, sig, x_pos, sig_y, width=150)
            
            elif num_sigs == 2:
                # Two signatures - left and right
                for i, sig in enumerate(signatures):
                    x_pos = 120 if i == 0 else width - 270
                    self._add_signature_to_pdf(c, sig, x_pos, sig_y, width=150)
            
            elif num_sigs >= 3:
                # Three signatures - left, center, right
                positions = [120, width / 2 - 75, width - 270]
                for i, sig in enumerate(signatures[:3]):  # Max 3 signatures
                    self._add_signature_to_pdf(c, sig, positions[i], sig_y, width=150)
        else:
            # Default signature line if no signatures uploaded
            c.line(width - 250, sig_y, width - 100, sig_y)
            c.setFont("Helvetica-Bold", 11)
            c.drawCentredString(width - 175, sig_y - 20, "REGISTRAR")
            c.setFont("Helvetica", 9)
            c.drawCentredString(width - 175, sig_y - 35, "Office of the Registrar")
        
        # ===== QR CODE =====
        if verification_token:
            try:
                qr_path = self.generate_qr_code(verification_token)
                # Add QR code in bottom left
                c.drawImage(qr_path, 50, 50, width=80, height=80)
                c.setFont("Helvetica", 7)
                c.drawString(50, 35, "Scan to verify")
            except Exception as e:
                print(f"Could not add QR code: {e}")
        
        # ===== FOOTER =====
        c.setFont("Helvetica-Oblique", 8)
        c.setFillColor(colors.grey)
        c.drawCentredString(
            width / 2, 
            30, 
            "This is a computer-generated certificate. Authentication can be verified via QR code."
        )
        
        # Decorative border
        c.setStrokeColor(colors.HexColor("#0066cc"))
        c.setLineWidth(3)
        c.rect(30, 30, width - 60, height - 60, fill=0)
        
        # Save PDF
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
        """
        Quick method to generate a basic certificate
        """
        certificate_data = {
            'student_name': student_name,
            'certificate_type': certificate_type,
            'program': program,
            'reference_number': reference_number,
            'issue_date': datetime.now().strftime('%B %d, %Y')
        }
        
        return self.generate_certificate(certificate_data)