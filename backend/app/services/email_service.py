import os
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
import aiosmtplib
from datetime import datetime

class EmailService:
    """
    Email service for sending notifications
    """
    
    def __init__(self):
        self.smtp_host = os.getenv("SMTP_HOST", "smtp.gmail.com")
        self.smtp_port = int(os.getenv("SMTP_PORT", "587"))
        self.smtp_user = os.getenv("SMTP_USER")
        self.smtp_password = os.getenv("SMTP_PASSWORD")
        self.from_email = os.getenv("FROM_EMAIL", self.smtp_user)
        self.from_name = os.getenv("FROM_NAME", "Certify System")
    
    async def send_request_confirmation(
        self,
        to_email: str,
        reference_number: str,
        pin: str,
        requestor_name: str,
        student_name: str,
        certificate_type: str,
        submitted_date: datetime
    ):
        subject = f"Certificate Request Confirmation - {reference_number}"
        
        html_body = f"""
        <!DOCTYPE html>
        <html>
        <head>
            <style>
                body {{ font-family: Arial, sans-serif; line-height: 1.6; color: #333; }}
                .container {{ max-width: 600px; margin: 0 auto; padding: 20px; }}
                .header {{ background-color: #17a2b8; color: white; padding: 20px; text-align: center; border-radius: 5px 5px 0 0; }}
                .content {{ background-color: #f8f9fa; padding: 30px; border: 1px solid #dee2e6; }}
                .info-box {{ background-color: white; padding: 20px; margin: 20px 0; border-left: 4px solid #17a2b8; border-radius: 4px; }}
                .credentials {{ background-color: #fff3cd; border: 2px solid #ffc107; padding: 20px; margin: 20px 0; border-radius: 4px; text-align: center; }}
                .credentials h3 {{ color: #856404; margin-top: 0; }}
                .pin-ref {{ font-size: 24px; font-weight: bold; color: #17a2b8; margin: 10px 0; }}
                .footer {{ text-align: center; padding: 20px; font-size: 12px; color: #6c757d; }}
                .button {{ display: inline-block; padding: 12px 24px; background-color: #17a2b8; color: white; text-decoration: none; border-radius: 4px; margin: 20px 0; }}
            </style>
        </head>
        <body>
            <div class="container">
                <div class="header">
                    <h1>🎓 Certify System</h1>
                    <p>Certificate Request Confirmation</p>
                </div>
                <div class="content">
                    <h2>Thank you for your request!</h2>
                    <p>Dear {requestor_name},</p>
                    <p>Your certificate request for <strong>{student_name}</strong> has been successfully submitted and is now being processed.</p>
                    <div class="credentials">
                        <h3>⚠️ IMPORTANT: Save These Details</h3>
                        <p><strong>Reference Number:</strong></p>
                        <div class="pin-ref">{reference_number}</div>
                        <p><strong>PIN:</strong></p>
                        <div class="pin-ref">{pin}</div>
                        <p style="font-size: 14px; color: #856404; margin-top: 10px;">
                            You will need both the reference number and PIN to track your request.
                        </p>
                    </div>
                    <div class="info-box">
                        <h3>Request Details</h3>
                        <p><strong>Student Name:</strong> {student_name}</p>
                        <p><strong>Certificate Type:</strong> {certificate_type}</p>
                        <p><strong>Submitted Date:</strong> {submitted_date.strftime("%B %d, %Y at %I:%M %p")}</p>
                        <p><strong>Status:</strong> Pending Review</p>
                    </div>
                    <div style="text-align: center;">
                        <a href="http://localhost:5173/track" class="button">Track Your Request</a>
                    </div>
                    <div class="info-box">
                        <h3>📌 Next Steps</h3>
                        <ul>
                            <li>Your request will be reviewed by the registrar's office</li>
                            <li>You will receive updates via email</li>
                            <li>Use your reference number and PIN to track your request status</li>
                            <li>Processing typically takes 2-5 business days</li>
                        </ul>
                    </div>
                    <div class="info-box">
                        <h3>📞 Need Help?</h3>
                        <p><strong>Email:</strong> registrar@school.edu</p>
                        <p><strong>Phone:</strong> (043) 425-0139</p>
                        <p><strong>Office Hours:</strong> Monday to Friday, 8:00 AM - 5:00 PM</p>
                    </div>
                </div>
                <div class="footer">
                    <p>This is an automated email. Please do not reply to this message.</p>
                    <p>© 2024 Certify System. All rights reserved.</p>
                </div>
            </div>
        </body>
        </html>
        """
        
        text_body = f"""
        Certificate Request Confirmation
        Dear {requestor_name},
        Your certificate request for {student_name} has been successfully submitted.
        Reference Number: {reference_number}
        PIN: {pin}
        Student Name: {student_name}
        Certificate Type: {certificate_type}
        Submitted: {submitted_date.strftime("%B %d, %Y at %I:%M %p")}
        Track your request at: http://localhost:5173/track
        """
        
        try:
            message = MIMEMultipart("alternative")
            message["Subject"] = subject
            message["From"] = f"{self.from_name} <{self.from_email}>"
            message["To"] = to_email
            message.attach(MIMEText(text_body, "plain"))
            message.attach(MIMEText(html_body, "html"))
            
            await aiosmtplib.send(
                message,
                hostname=self.smtp_host,
                port=self.smtp_port,
                username=self.smtp_user,
                password=self.smtp_password,
                start_tls=True,
            )
            print(f"✅ Confirmation email sent to {to_email}")
            return True
        except Exception as e:
            print(f"❌ Failed to send email: {e}")
            return False

    async def send_status_update(
        self,
        to_email: str,
        reference_number: str,
        requestor_name: str,
        student_name: str,
        old_status: str,
        new_status: str,
        notes: str = None
    ):
        subject = f"Status Update: {reference_number} - {new_status}"
        
        status_messages = {
            "APPROVED": "✅ Good news! Your request has been approved.",
            "PROCESSING": "⚙️ Your certificate is now being generated.",
            "FOR_REVIEW": "👀 Your certificate is ready for final review.",
            "FOR_RELEASING": "🎉 Your certificate is ready for pickup!",
            "COMPLETED": "✨ Your certificate has been released.",
            "REJECTED": "❌ Unfortunately, your request was not approved.",
        }
        
        status_message = status_messages.get(new_status, "Your request status has been updated.")
        
        html_body = f"""
        <!DOCTYPE html>
        <html>
        <head>
            <style>
                body {{ font-family: Arial, sans-serif; line-height: 1.6; color: #333; }}
                .container {{ max-width: 600px; margin: 0 auto; padding: 20px; }}
                .header {{ background-color: #17a2b8; color: white; padding: 20px; text-align: center; border-radius: 5px 5px 0 0; }}
                .content {{ background-color: #f8f9fa; padding: 30px; border: 1px solid #dee2e6; }}
                .status-box {{ background-color: white; padding: 20px; margin: 20px 0; border-left: 4px solid #28a745; border-radius: 4px; text-align: center; }}
                .button {{ display: inline-block; padding: 12px 24px; background-color: #17a2b8; color: white; text-decoration: none; border-radius: 4px; margin: 20px 0; }}
            </style>
        </head>
        <body>
            <div class="container">
                <div class="header"><h1>Status Update</h1></div>
                <div class="content">
                    <p>Dear {requestor_name},</p>
                    <div class="status-box">
                        <h2>{status_message}</h2>
                        <p><strong>Student Name:</strong> {student_name}</p>
                        <p><strong>Reference Number:</strong> {reference_number}</p>
                        <p><strong>New Status:</strong> {new_status.replace('_', ' ')}</p>
                    </div>
                    {f'<p><strong>Note:</strong> {notes}</p>' if notes else ''}
                    <div style="text-align: center;">
                        <a href="http://localhost:5173/track" class="button">View Full Details</a>
                    </div>
                </div>
            </div>
        </body>
        </html>
        """
        
        try:
            message = MIMEMultipart("alternative")
            message["Subject"] = subject
            message["From"] = f"{self.from_name} <{self.from_email}>"
            message["To"] = to_email
            message.attach(MIMEText(html_body, "html"))
            
            await aiosmtplib.send(
                message,
                hostname=self.smtp_host,
                port=self.smtp_port,
                username=self.smtp_user,
                password=self.smtp_password,
                start_tls=True,
            )
            print(f"✅ Status update email sent to {to_email}")
            return True
        except Exception as e:
            print(f"❌ Failed to send email: {e}")
            return False

    # ✅ Properly defined as its own method — not nested inside send_status_update
    async def send_ready_for_release(
        self,
        to_email: str,
        reference_number: str,
        requestor_name: str,
        student_name: str,
        certificate_type: str,
    ):
        subject = f"Your Certificate is Ready for Pickup – {reference_number}"

        html_body = f"""
        <!DOCTYPE html>
        <html>
        <head>
            <style>
                body {{ font-family: Arial, sans-serif; line-height: 1.6; color: #333; }}
                .container {{ max-width: 600px; margin: 0 auto; padding: 20px; }}
                .header {{ background-color: #ee1133; color: white; padding: 20px; text-align: center; border-radius: 5px 5px 0 0; }}
                .content {{ background-color: #f8f9fa; padding: 30px; border: 1px solid #dee2e6; }}
                .info-box {{ background-color: white; padding: 20px; margin: 20px 0; border-left: 4px solid #ee1133; border-radius: 4px; }}
                .highlight {{ font-size: 20px; font-weight: bold; color: #ee1133; }}
                .footer {{ text-align: center; padding: 20px; font-size: 12px; color: #6c757d; }}
                .button {{ display: inline-block; padding: 12px 24px; background-color: #ee1133; color: white; text-decoration: none; border-radius: 4px; margin: 20px 0; }}
            </style>
        </head>
        <body>
            <div class="container">
                <div class="header">
                    <h1>🎉 Your Certificate is Ready!</h1>
                </div>
                <div class="content">
                    <p>Dear {requestor_name},</p>
                    <p>Great news! Your certificate request is now <strong>ready for pickup</strong> at the Registrar's Office.</p>

                    <div class="info-box">
                        <p><strong>Reference No:</strong> <span class="highlight">{reference_number}</span></p>
                        <p><strong>Student Name:</strong> {student_name}</p>
                        <p><strong>Certificate:</strong> {certificate_type}</p>
                    </div>

                    <div class="info-box">
                        <h3>📋 What to bring</h3>
                        <ul>
                            <li>Valid ID</li>
                            <li>Your reference number: <strong>{reference_number}</strong></li>
                            <li>Authorization letter + representative's valid ID (if claiming via representative)</li>
                        </ul>
                    </div>

                    <div class="info-box">
                        <h3>🕐 Office Hours</h3>
                        <p>Monday to Friday · 8:00 AM to 5:00 PM</p>
                        <p><strong>Phone:</strong> (043) 425-0139</p>
                    </div>

                    <div style="text-align: center;">
                        <a href="http://localhost:5173/track" class="button">Track Your Request</a>
                    </div>
                </div>
                <div class="footer">
                    <p>This is an automated email. Please do not reply to this message.</p>
                    <p>© 2024 Certify System. All rights reserved.</p>
                </div>
            </div>
        </body>
        </html>
        """

        text_body = f"""
        Your Certificate is Ready for Pickup!

        Dear {requestor_name},

        Your certificate request is now ready for pickup at the Registrar's Office.

        Reference No: {reference_number}
        Student Name: {student_name}
        Certificate: {certificate_type}

        Please bring a valid ID and your reference number when claiming.
        Office Hours: Monday to Friday, 8:00 AM - 5:00 PM
        """

        try:
            message = MIMEMultipart("alternative")
            message["Subject"] = subject
            message["From"] = f"{self.from_name} <{self.from_email}>"
            message["To"] = to_email
            message.attach(MIMEText(text_body, "plain"))
            message.attach(MIMEText(html_body, "html"))

            await aiosmtplib.send(
                message,
                hostname=self.smtp_host,
                port=self.smtp_port,
                username=self.smtp_user,
                password=self.smtp_password,
                start_tls=True,
            )
            print(f"✅ Ready-for-release email sent to {to_email}")
            return True
        except Exception as e:
            print(f"❌ Failed to send ready-for-release email: {e}")
            return False