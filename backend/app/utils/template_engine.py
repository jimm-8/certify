from reportlab.lib.pagesizes import letter
from reportlab.lib.units import inch
from reportlab.pdfgen import canvas
from reportlab.lib import colors
import os

class TemplateEngine:
    """
    Certificate template engine for Letter size (8.5 x 11 inches)
    """
    
    # Page constants
    PAGE_WIDTH = 612   # 8.5 inches in points
    PAGE_HEIGHT = 792  # 11 inches in points
    
    # Margins (0.5 inch)
    TOP_MARGIN = 36
    BOTTOM_MARGIN = 36
    LEFT_MARGIN = 36
    RIGHT_MARGIN = 36
    
    def __init__(self, output_dir="uploads/certificates"):
        self.output_dir = output_dir
        os.makedirs(output_dir, exist_ok=True)
    
    def generate_certificate_from_template(
        self,
        template,
        certificate_data: dict,
        output_path: str
    ) -> str:
        """
        Generate certificate using Letter size paper
        """
        # Create PDF with Letter size
        c = canvas.Canvas(output_path, pagesize=letter)
        width, height = letter  # 612 x 792
        
        # Add decorative border (optional)
        self._add_border(c, width, height)
        
        # Render header
        current_y = self._render_header(c, template.header_text, width, height)
        
        # Render title
        current_y = self._render_title(
            c, 
            template.template_name, 
            width, 
            current_y
        )
        
        # Render body text
        current_y = self._render_body(
            c,
            template.body_template,
            certificate_data,
            width,
            current_y
        )
        
        # Render special sections (forms, tables, lists)
        if template.sections:
            for section in template.sections:
                current_y = self._render_section(
                    c,
                    section,
                    certificate_data,
                    width,
                    current_y
                )
        
        # Render signatures
        self._render_signatures(
            c,
            template.layout_config.get('signature_layout', 'dual'),
            width
        )
        
        # Render footer
        self._render_footer(c, width, height)
        
        c.save()
        return output_path
    
    def _add_border(self, c, width, height):
        """
        Add decorative border around the page
        """
        # Outer border (blue)
        c.setStrokeColor(colors.HexColor("#0066cc"))
        c.setLineWidth(3)
        c.rect(
            self.LEFT_MARGIN,
            self.BOTTOM_MARGIN,
            width - self.LEFT_MARGIN - self.RIGHT_MARGIN,
            height - self.TOP_MARGIN - self.BOTTOM_MARGIN,
            fill=0
        )
        
        # Inner accent border (thin)
        c.setStrokeColor(colors.HexColor("#0066cc"))
        c.setLineWidth(0.5)
        c.rect(
            self.LEFT_MARGIN + 10,
            self.BOTTOM_MARGIN + 10,
            width - self.LEFT_MARGIN - self.RIGHT_MARGIN - 20,
            height - self.TOP_MARGIN - self.BOTTOM_MARGIN - 20,
            fill=0
        )
    
    def _render_header(self, c, header_text, width, height):
        """
        Render university header at top
        Returns: Y position for next element
        """
        y_pos = height - 70  # Start 70 points from top
        
        # University name
        c.setFont("Helvetica-Bold", 18)
        c.drawCentredString(width / 2, y_pos, "BATANGAS STATE UNIVERSITY")
        
        y_pos -= 20
        
        # Office name
        c.setFont("Helvetica", 12)
        c.drawCentredString(width / 2, y_pos, "Office of the Registrar")
        
        y_pos -= 15
        
        # Address
        c.setFont("Helvetica", 10)
        c.drawCentredString(
            width / 2, 
            y_pos, 
            "Alangilan, Batangas City, Philippines"
        )
        
        y_pos -= 25
        
        # Decorative line
        c.setStrokeColor(colors.HexColor("#0066cc"))
        c.setLineWidth(2)
        line_margin = 80
        c.line(line_margin, y_pos, width - line_margin, y_pos)
        
        return y_pos - 30  # Return next available Y position
    
    def _render_title(self, c, title_text, width, current_y):
        """
        Render certificate title (e.g., "CERTIFICATE OF ENROLLMENT")
        """
        c.setFont("Helvetica-Bold", 20)
        c.setFillColor(colors.HexColor("#0066cc"))
        c.drawCentredString(width / 2, current_y, title_text.upper())
        c.setFillColor(colors.black)  # Reset color
        
        return current_y - 40
    
    def _render_body(self, c, body_template, data, width, current_y):
        """
        Render main certificate body text with data substitution
        """
        # Replace placeholders
        body_text = body_template.format(**data)
        
        # Split into paragraphs if needed
        paragraphs = body_text.split('\n')
        
        c.setFont("Helvetica", 12)
        
        for paragraph in paragraphs:
            if not paragraph.strip():
                current_y -= 10  # Empty line spacing
                continue
            
            # Wrap long lines
            wrapped_lines = self._wrap_text(
                paragraph.strip(), 
                max_width=width - 150,  # Leave margins
                font="Helvetica",
                font_size=12
            )
            
            for line in wrapped_lines:
                c.drawString(self.LEFT_MARGIN + 40, current_y, line)
                current_y -= 18  # Line spacing
        
        return current_y - 20  # Extra space after body
    
    def _wrap_text(self, text, max_width, font="Helvetica", font_size=12):
        """
        Wrap text to fit within max_width
        Returns list of lines
        """
        from reportlab.pdfbase.pdfmetrics import stringWidth
        
        words = text.split()
        lines = []
        current_line = []
        
        for word in words:
            test_line = ' '.join(current_line + [word])
            width = stringWidth(test_line, font, font_size)
            
            if width <= max_width:
                current_line.append(word)
            else:
                if current_line:
                    lines.append(' '.join(current_line))
                current_line = [word]
        
        if current_line:
            lines.append(' '.join(current_line))
        
        return lines
    
    def _render_section(self, c, section_config, data, width, current_y):
        """
        Render special sections (forms, tables, lists)
        """
        section_type = section_config.get('type')
        
        if section_type == 'student_info_form':
            return self._render_info_form(c, data, width, current_y)
        
        elif section_type == 'course_list':
            return self._render_course_list(c, data, width, current_y)
        
        return current_y
    
    def _render_info_form(self, c, data, width, current_y):
        """
        Render student information form
        
        Example output:
        Name of Student    : Juan Dela Cruz
        Degree            : Bachelor of Science
        Date of Graduation : March 2024
        """
        # Define form fields
        form_fields = [
            ('Name of Student', data.get('student_name', '')),
            ('Degree', data.get('degree', '')),
            ('Date of Graduation', data.get('graduation_date', '')),
            ('Name of Institution', data.get('institution', 'Batangas State University')),
            ('Address', data.get('address', ''))
        ]
        
        # Positioning
        label_x = self.LEFT_MARGIN + 60
        colon_x = label_x + 150
        value_x = colon_x + 15
        line_end_x = width - self.RIGHT_MARGIN - 60
        
        c.setFont("Helvetica", 11)
        
        for label, value in form_fields:
            # Skip if no value
            if not value:
                continue
            
            # Draw label
            c.drawString(label_x, current_y, label)
            
            # Draw colon
            c.drawString(colon_x, current_y, ":")
            
            # Draw value
            c.drawString(value_x, current_y, str(value))
            
            # Draw underline
            c.line(value_x, current_y - 3, line_end_x, current_y - 3)
            
            current_y -= 25
        
        return current_y - 20  # Extra spacing after form
    
    def _render_course_list(self, c, data, width, current_y):
        """
        Render course list section
        
        Example output:
        Course Code  : CPE 101        Credits : 3
        _____________________________________________
        
        Course Code  : CPE 102        Credits : 3
        _____________________________________________
        """
        courses = data.get('courses', [])
        
        if not courses:
            return current_y
        
        # Positioning
        label_x = self.LEFT_MARGIN + 60
        line_end_x = width - self.RIGHT_MARGIN - 60
        
        c.setFont("Helvetica", 11)
        
        for course in courses:
            # Course Code section
            course_label_x = label_x
            course_value_x = label_x + 90
            
            # Credits section  
            credits_label_x = label_x + 250
            credits_value_x = credits_label_x + 60
            
            # Draw course code
            c.drawString(course_label_x, current_y, "Course Code")
            c.drawString(course_label_x + 75, current_y, ":")
            c.drawString(course_value_x, current_y, course.get('code', 'N/A'))
            
            # Draw credits
            c.drawString(credits_label_x, current_y, "Credits")
            c.drawString(credits_label_x + 48, current_y, ":")
            c.drawString(credits_value_x, current_y, str(course.get('credits', '')))
            
            current_y -= 5
            
            # Draw separator line
            c.setLineWidth(0.5)
            c.line(label_x, current_y, line_end_x, current_y)
            
            current_y -= 25  # Space before next course
        
        return current_y - 20
    
    def _render_signatures(self, c, signature_layout, width):
        """
        Render signature section at bottom of page
        """
        sig_y = 180  # Fixed position from bottom
        
        c.setFont("Helvetica", 10)
        
        if signature_layout == 'single':
            # Single signature - right side
            sig_x = width - 220
            self._draw_signature_block(c, sig_x, sig_y, "REGISTRAR")
        
        elif signature_layout == 'dual':
            # Two signatures - left and right
            left_x = 100
            right_x = width - 220
            
            self._draw_signature_block(c, left_x, sig_y, "VERIFIED BY")
            self._draw_signature_block(c, right_x, sig_y, "REGISTRAR")
        
        elif signature_layout == 'triple':
            # Three signatures
            left_x = 80
            center_x = (width / 2) - 75
            right_x = width - 230
            
            self._draw_signature_block(c, left_x, sig_y, "VERIFIED BY")
            self._draw_signature_block(c, center_x, sig_y, "APPROVED BY")
            self._draw_signature_block(c, right_x, sig_y, "REGISTRAR")
    
    def _draw_signature_block(self, c, x_pos, y_pos, title):
        """
        Draw a single signature block
        """
        line_width = 150
        
        # Signature line
        c.setLineWidth(1)
        c.line(x_pos, y_pos, x_pos + line_width, y_pos)
        
        # Name placeholder (would come from database)
        c.setFont("Helvetica-Bold", 10)
        c.drawCentredString(x_pos + line_width/2, y_pos - 15, "NAME HERE")
        
        # Title
        c.setFont("Helvetica", 9)
        c.drawCentredString(x_pos + line_width/2, y_pos - 28, title)
    
    def _render_footer(self, c, width, height):
        """
        Render footer with verification notice
        """
        footer_y = 40
        
        c.setFont("Helvetica-Oblique", 8)
        c.setFillColor(colors.grey)
        c.drawCentredString(
            width / 2,
            footer_y,
            "This is a computer-generated certificate. Verify authenticity via QR code."
        )
        c.setFillColor(colors.black)