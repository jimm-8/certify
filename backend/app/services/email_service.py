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
        submitted_date: datetime,
        request_cost: str | float | None = None,
        campus_email: str | None = None,
        campus_telNo: str | None = None,
        track_url: str | None = None,
    ):
        subject = f"Certificate Request Confirmation - {reference_number}"
        contact_email = campus_email or os.getenv("HELP_EMAIL", "registrar@school.edu")
        contact_phone = campus_telNo or os.getenv("HELP_PHONE", "(043) 425-0139")
        tracking_url = track_url or os.getenv(
            "TRACK_URL", "http://localhost:5173/track"
        )
        payment_amount = (
            request_cost
            if request_cost not in {None, ""}
            else os.getenv("DEFAULT_REQUEST_COST", "0")
        )

        html_body = f"""
        <!DOCTYPE html>
        <html>

        <head>
        <style>
            /* Global Styles */
            body {{
            font-family: 'Segoe UI', Arial, sans-serif;
            line-height: 1.6;
            color: #333;
            background-color: #f4f7f9;
            margin: 0;
            padding: 20px;
            }}

            .container {{
            max-width: 600px;
            margin: 0 auto;
            background: #ffffff;
            border-radius: 8px;
            overflow: hidden;
            border: 1px solid #DE1B1B;
            box-shadow: 0 4px 6px rgba(0, 0, 0, 0.05);
            }}

            /* Header */
            .header {{
            background-color: #DE1B1B;
            color: white;
            padding: 10px;
            text-align: center;
            font-size: 14pt;
            }}

            .content {{
            padding: 10px 30px;
            font-size: 10pt;
            text-align: justify;
            }}

            .request-card {{
            width: 100%;
            border: 1px solid #373737;
            border-radius: 8px;
            overflow: hidden;
            margin: 25px 0;
            }}

            .card-header {{
            background-color: #373737;
            padding: 5px 16px;
            font-weight: bold;
            border-bottom: 1px solid #373737;
            color: #fff;
            }}

            .card-content {{
            padding: 5px 16px;
            background-color: #ffffff;
            }}

            .card-content p {{
            margin: 5px 0;
            font-size: 10pt;
            }}

            .note {{
            font-size: 8pt;
            margin-top: -5px;
            text-align: center;
            color: #333;
            }}

            .button {{
            display: block;
            width: 100%;
            padding: 5px 0;
            text-align: center;
            border: 1px solid #DE1B1B;
            border-radius: 8px;
            background-color: #DE1B1B;
            color: #ffffff;
            text-decoration: none;
            }}

            .footer {{
            text-align: center;
            font-size: 0.8rem;
            color: #777;
            padding: 10px;
            border-top: 1px solid #eee;
            }}
        </style>
        </head>

        <body>

        <div class="container">
            <div class="header">
            <strong>We have received your request!</strong>
            </div>

            <div class="content">
            <p>Dear {requestor_name},</p>
            <p>Your certificate request for {student_name} has been successfully submitted. Please review your request
                details below and follow the instructions to complete your payment.</p>

            <div class="request-card">
                <div class="card-header">Request Details</div>
                <div class="card-content">
                <p><strong>Student Name:</strong> <span class="variable">{student_name}</span></p>
                <p><strong>Certificate Type:</strong> {certificate_type}</p>
                <p><strong>Submitted Date:</strong> {submitted_date.strftime("%B %d, %Y at %I:%M %p")}</p>
                <p><strong>Status:</strong> <span style="color: #d39e00; font-weight: bold;">Pending Review</span></p>
                </div>
            </div>

            <div class="request-card">
                <div class="card-header">Payment Instructions</div>
                <div class="card-content">
                <p style="text-align: center;">You will pay a total of <strong>Php {payment_amount}</strong>.</p>
                <p>Step 1: Proceed to the Cashier's Office and state your purpose.</p>
                <p>Step 2: Provide your <strong>Reference Number</strong> to the cashier so it can be recorded as the purpose
                    of payment.</p>
                <p>Step 3: Wait for an email confirmation notifying you that your certificate is ready for pickup.</p>
                </div>
            </div>

            <div class="request-card">
                <div class="card-header">Important Reminder</div>
                <div class="card-content">
                <p><strong>Reference No.:</strong> <span class="variable">{reference_number}</span></p>
                <p><strong>PIN:</strong> {pin}</p>
                </div>
                <p class="note">
                <i>Note:</i> You will need both the reference number and PIN to track your request.
                </p>
            </div>

            <a href="{tracking_url}" class="button">Track Your Request</a>

            <div class="request-card">
                <div class="card-header">Need Help?</div>
                <div class="card-content">
                <p><strong>Email:</strong> <span class="variable">{contact_email}</span></p>
                <p><strong>Tel Nos.:</strong> {contact_phone}</p>
                </div>
            </div>
            </div>

            <div class="footer">
            <p>This is an automated email. Please do not reply.<br>
                © 2024 Certify System. All rights reserved.</p>
            </div>
        </div>

        </body>

        </html>
        """

        text_body = f"""
        We have received your request!

        Dear {requestor_name},
        Your certificate request for {student_name} has been successfully submitted.

        Request Details:
        - Student Name: {student_name}
        - Certificate Type: {certificate_type}
        - Submitted: {submitted_date.strftime("%B %d, %Y at %I:%M %p")}
        - Status: Pending Review

        Payment Instructions:
        1) Proceed to the Cashier's Office and state your purpose.
        2) Provide your Reference Number to the cashier for payment.
        3) Wait for an email confirmation when your certificate is ready.
        Amount to pay: Php {payment_amount}

        Important Reminder:
        Reference No.: {reference_number}
        PIN: {pin}

        Track your request at: {tracking_url}
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
        notes: str = None,
    ):
        subject = f"Status Update: {reference_number} - {new_status}"

        status_messages = {
            "APPROVED": "✅ Good news! Your request has been approved.",
            "PROCESSING": "⚙️ Your certificate is now being generated.",
            "FOR_REVIEW": "👀 Your certificate is ready for final review.",
            "FOR_RELEASING": "🎉 Your certificate is ready for pickup!",
            "RELEASED": "? Your certificate has been released.",
        }

        status_message = status_messages.get(
            new_status, "Your request status has been updated."
        )

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
        campus_telNo: str | None = None,
    ):
        subject = f"Your Certificate is Ready for Pickup – {reference_number}"
        contact_phone = campus_telNo or os.getenv("HELP_PHONE", "(043) 425-0139")
        safe_requestor_name = (requestor_name or "").strip() or "Requestor"

        html_body = f"""
        <!DOCTYPE html>
        <html>

        <head>
        <style>
            /* Global Styles */
            body {{
            font-family: 'Segoe UI', Arial, sans-serif;
            line-height: 1.6;
            color: #333;
            background-color: #f4f7f9;
            margin: 0;
            padding: 20px;
            }}

            .container {{
            max-width: 600px;
            margin: 0 auto;
            background: #ffffff;
            border-radius: 8px;
            overflow: hidden;
            border: 1px solid #DE1B1B;
            box-shadow: 0 4px 6px rgba(0, 0, 0, 0.05);
            }}

            /* Header */
            .header {{
            background-color: #DE1B1B;
            color: white;
            padding: 10px;
            text-align: center;
            font-size: 14pt;
            }}

            .content {{
            padding: 10px 30px;
            font-size: 10pt;
            text-align: justify;
            }}

            .request-card {{
            width: 100%;
            border: 1px solid #373737;
            border-radius: 8px;
            overflow: hidden;
            margin: 25px 0;
            }}

            .card-header {{
            background-color: #373737;
            padding: 5px 16px;
            font-weight: bold;
            border-bottom: 1px solid #373737;
            color: #fff;
            }}

            .card-content {{
            padding: 5px 16px;
            background-color: #ffffff;
            }}

            .card-content p {{
            margin: 5px 0;
            font-size: 10pt;
            }}

            .note {{
            font-size: 8pt;
            margin-top: -5px;
            text-align: center;
            color: #333;
            }}

            .button {{
            display: block;
            width: 100%;
            padding: 5px 0;
            text-align: center;
            border: 1px solid #DE1B1B;
            border-radius: 8px;
            background-color: #DE1B1B;
            color: #ffffff;
            text-decoration: none;
            }}

            .footer {{
            text-align: center;
            font-size: 0.8rem;
            color: #777;
            padding: 10px;
            border-top: 1px solid #eee;
            }}
        </style>
        </head>

        <body>

        <div class="container">
            <div class="header">
            <strong>Your Certificate is Ready!</strong>
            </div>

            <div class="content">
            <p>Dear {safe_requestor_name},</p>
            <p>Great news! Your certificate request is now <strong style="color: #DE1B1B;">READY FOR PICKUP</strong> at the
                Registrar's Office.</p>


            <div class="request-card">
                <div class="card-header">Request Summary</div>
                <div class="card-content">
                <p><strong>Reference Number:</strong> <span class="variable"> {reference_number}</span></p>
                <p><strong>Certificate for:</strong> {student_name}</p>
                <p><strong>Submitted Type:</strong> {certificate_type}</p>
                </div>
            </div>

            <div class="request-card">
                <div class="card-header">Claiming Instructions</div>
                <div class="card-content">
                <p>Step 1: Proceed to the <strong>Registrar's Office</strong> and state your purpose.</p>
                <p>Step 2: Present <strong>this</strong> email along with your <strong>Official Receipt</strong> for
                    verification</p>
                <p>Receive your document and sign the log book to complete the process.</p>
                </div>
                <p class="note">
                <i>Note:</i> Registrar may ask you to present documents supporting your request. Such as valid ID's,
                Authorization Letter, etc.
                </p>
            </div>

            <div class="request-card">
                <div class="card-header">Office Hours</div>
                <div class="card-content">
                <p>Monday to Friday: 8:00 AM to 5:00 PM</p>
                <p><strong>Tel Nos.:</strong> {contact_phone}</p>
                </div>
            </div>
            </div>

            <div class="footer">
            <p>This is an automated email. Please do not reply.<br>
                © 2024 Certify System. All rights reserved.</p>
            </div>
        </div>

        </body>

        </html>
        """

        text_body = f"""
        Your Certificate is Ready for Pickup!

        Dear {safe_requestor_name},

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

    async def send_payment_missing_notice(
        self,
        to_email: str,
        reference_number: str,
        requestor_name: str,
        student_name: str,
        certificate_type: str,
        request_cost: str | float | None = None,
        campus_email: str | None = None,
        campus_telNo: str | None = None,
    ):
        subject = f"Payment Required Before Release - {reference_number}"
        payment_amount = (
            request_cost
            if request_cost not in {None, ""}
            else os.getenv("DEFAULT_REQUEST_COST", "0")
        )
        contact_email = (
            campus_email.strip()
            if campus_email and campus_email.strip()
            else os.getenv("HELP_EMAIL", "registrar@school.edu")
        )
        contact_phone = (campus_telNo or "").strip() or os.getenv(
            "HELP_PHONE", "(043) 425-0139"
        )
        safe_requestor_name = (requestor_name or "").strip() or "Requestor"

        html_body = f"""
        <!DOCTYPE html>
        <html>

        <head>
        <style>
            /* Global Styles */
            body {{
            font-family: 'Segoe UI', Arial, sans-serif;
            line-height: 1.6;
            color: #333;
            background-color: #f4f7f9;
            margin: 0;
            padding: 20px;
            }}

            .container {{
            max-width: 600px;
            margin: 0 auto;
            background: #ffffff;
            border-radius: 8px;
            overflow: hidden;
            border: 1px solid #DE1B1B;
            box-shadow: 0 4px 6px rgba(0, 0, 0, 0.05);
            }}

            /* Header */
            .header {{
            background-color: #DE1B1B;
            color: white;
            padding: 10px;
            text-align: center;
            font-size: 14pt;
            }}

            .content {{
            padding: 10px 30px;
            font-size: 10pt;
            text-align: justify;
            }}

            .request-card {{
            width: 100%;
            border: 1px solid #373737;
            border-radius: 8px;
            overflow: hidden;
            margin: 25px 0;
            }}

            .card-header {{
            background-color: #373737;
            padding: 5px 16px;
            font-weight: bold;
            border-bottom: 1px solid #373737;
            color: #fff;
            }}

            .card-content {{
            padding: 5px 16px;
            background-color: #ffffff;
            }}

            .card-content p {{
            margin: 5px 0;
            font-size: 10pt;
            }}

            .note {{
            font-size: 8pt;
            margin-top: -5px;
            text-align: center;
            color: #333;
            }}

            .button {{
            display: block;
            width: 100%;
            padding: 5px 0;
            text-align: center;
            border: 1px solid #DE1B1B;
            border-radius: 8px;
            background-color: #DE1B1B;
            color: #ffffff;
            text-decoration: none;
            }}

            .footer {{
            text-align: center;
            font-size: 0.8rem;
            color: #777;
            padding: 10px;
            border-top: 1px solid #eee;
            }}
        </style>
        </head>

        <body>

        <div class="container">
            <div class="header">
            <strong>Payment Required</strong>
            </div>

            <div class="content">
            <p>Dear {safe_requestor_name},</p>
            <p>We attempted to move your request to <strong>For Releasing</strong>, but the system did not detect a payment
                for this request. Please settle the payment at the cashier and make sure the <strong>reference number</strong>
                is used as the <strong>purpose</strong> of payment.</p>



            <div class="request-card">
                <div class="card-header">Request Summary</div>
                <div class="card-content">
                <p><strong>Reference Number:</strong> <span class="variable"> {reference_number}</span></p>
                <p><strong>Certificate for:</strong> {student_name}</p>
                <p><strong>Submitted Type:</strong> {certificate_type}</p>
                </div>
            </div>

            <div class="request-card">
                <div class="card-header">Payment Instructions</div>
                <div class="card-content">
                <p style="text-align: center;">You will pay a total of <strong>Php {payment_amount}</strong>.</p>
                <p>Step 1: Proceed to the Cashier's Office and state your purpose.</p>
                <p>Step 2: Provide your <strong>Reference Number</strong> to the cashier so it can be recorded as the purpose
                    of payment.</p>
                <p>Step 3: Wait for an email confirmation notifying you that your certificate is ready for pickup.</p>
                </div>
            </div>

            <div class="request-card">
                <div class="card-header">Need Help?</div>
                <div class="card-content">
                <p><strong>Email:</strong> <span class="variable">{contact_email}</span></p>
                <p><strong>Tel Nos.:</strong> {contact_phone}</p>
                </div>
            </div>
            </div>

            <div class="footer">
            <p>This is an automated email. Please do not reply.<br>
                © 2024 Certify System. All rights reserved.</p>
            </div>
        </div>

        </body>

        </html>
        """

        text_body = f"""
        Payment Required Before Release

        Dear {safe_requestor_name},
        We cannot move your request to For Releasing because no payment was detected.

        Reference No.: {reference_number}
        Student Name: {student_name}
        Certificate Type: {certificate_type}
        Amount Due: Php {payment_amount}

        Please proceed to the cashier and use your Reference Number as the purpose of payment.
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
            print(f"✅ Payment-missing email sent to {to_email}")
            return True
        except Exception as e:
            print(f"❌ Failed to send payment-missing email: {e}")
            return False
