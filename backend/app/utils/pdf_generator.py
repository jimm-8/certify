from __future__ import annotations
import os
import logging
import base64
import mimetypes
from datetime import datetime
from pathlib import Path
import qrcode
from reportlab.lib import colors
from reportlab.lib.pagesizes import letter
from reportlab.pdfgen import canvas
import tempfile
from reportlab.lib.units import inch
import re

logger = logging.getLogger(__name__)


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

        rendered_html = certificate_data.get("rendered_html")
        template_base_path = certificate_data.get("template_base_path")
        if rendered_html:
            self._generate_from_html(
                rendered_html=rendered_html,
                output_path=filepath,
                base_path=template_base_path,
            )
            return filepath

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

    @staticmethod
    def _generate_from_html(rendered_html: str, output_path: str, base_path: str | None = None) -> None:
        # Ensure common logo filename alias exists so templates referencing
        # 'Batangas_State_Logo.png' will resolve to the available 'bsu.png'.
        if base_path:
            try:
                tpl_dir = Path(base_path)
                logo_expected = tpl_dir / "Batangas_State_Logo.png"
                alt_logo = tpl_dir / "bsu.png"
                if not logo_expected.exists() and alt_logo.exists():
                    try:
                        # copy as a convenience -- safe and idempotent
                        import shutil

                        shutil.copyfile(str(alt_logo), str(logo_expected))
                    except Exception:
                        pass
            except Exception:
                pass

        def _dir_as_base_href(path: str | None) -> str:
            base_dir = Path(path).resolve() if path else Path(os.getcwd()).resolve()
            href = base_dir.as_uri()
            # Important for relative URL resolution: a directory base must end with '/'
            return href if href.endswith("/") else (href + "/")

        def _inject_base_href(html: str, base_href: str) -> str:
            # If the template already defines a base, don't override it.
            if re.search(r"<\s*base\b", html, flags=re.IGNORECASE):
                return html

            head_match = re.search(r"<\s*head\b[^>]*>", html, flags=re.IGNORECASE)
            if head_match:
                insert_at = head_match.end()
                return f"{html[:insert_at]}\n    <base href=\"{base_href}\">\n{html[insert_at:]}"

            # Fallback: prepend a minimal head so relative resources still resolve.
            return f"<head><base href=\"{base_href}\"></head>\n{html}"

        def _inline_known_local_images(html: str, base_dir: Path) -> str:
            # Inlining the logo as a data URI makes rendering reliable across engines.
            known = {"batangas_state_logo.png", "bsu.png"}

            def repl(match: re.Match[str]) -> str:
                quote = match.group("q")
                uri = match.group("uri").strip()
                if uri.startswith(("http://", "https://", "data:")):
                    return match.group(0)

                try:
                    candidate = (base_dir / uri).resolve()
                except Exception:
                    return match.group(0)

                if candidate.name.lower() not in known or not candidate.exists():
                    return match.group(0)

                mime = mimetypes.guess_type(str(candidate))[0] or "image/png"
                try:
                    data = base64.b64encode(candidate.read_bytes()).decode("ascii")
                except Exception:
                    return match.group(0)

                return f"src={quote}data:{mime};base64,{data}{quote}"

            return re.sub(r"""src=(?P<q>["'])(?P<uri>[^"']+)(?P=q)""", repl, html, flags=re.IGNORECASE)

        base_href = _dir_as_base_href(base_path)
        rendered_html = _inject_base_href(rendered_html, base_href)
        if base_path:
            rendered_html = _inline_known_local_images(rendered_html, Path(base_path))

        renderer = (os.getenv("CERTIFY_PDF_RENDERER", "auto") or "auto").strip().lower()
        debug = (os.getenv("CERTIFY_PDF_DEBUG", "0") or "0").strip().lower() in {"1", "true", "yes", "on"}
        if renderer not in {"auto", "playwright"}:
            renderer = "auto"

        def _log(msg: str) -> None:
            if debug:
                logger.info(msg)

        def _raise_or_fallback(stage: str, exc: Exception) -> None:
            if renderer == stage:
                raise RuntimeError(f"PDF render failed using {stage}: {exc}") from exc
            _log(f"{stage} failed, falling back: {exc}")

        # Prefer Playwright (Chromium) for rendering modern CSS accurately when available.
        if renderer in {"auto", "playwright"}:
            try:
                # Playwright needs a Proactor event loop on Windows for subprocesses.
                if os.name == "nt":
                    try:
                        import asyncio

                        policy = asyncio.get_event_loop_policy()
                        if not isinstance(policy, asyncio.WindowsProactorEventLoopPolicy):
                            asyncio.set_event_loop_policy(asyncio.WindowsProactorEventLoopPolicy())
                    except Exception:
                        pass

                from playwright.sync_api import sync_playwright

                with sync_playwright() as pw:
                    browser = pw.chromium.launch()
                    context = browser.new_context(viewport={"width": 816, "height": 1056})
                    page = context.new_page()

                    # Load HTML and let local assets (images/css/fonts) resolve via <base href="file:///.../">
                    page.set_content(rendered_html, wait_until="load")
                    try:
                        page.wait_for_load_state("networkidle", timeout=5000)
                    except Exception:
                        pass

                    # Ensure @page rules are applied as in print output.
                    try:
                        page.emulate_media(media="print")
                    except Exception:
                        pass

                    # Attempt to print directly to PDF using CSS @page sizes and zero margins.
                    try:
                        # prefer_css_page_size allows templates' @page size to be respected
                        try:
                            page.pdf(
                                path=output_path,
                                print_background=True,
                                prefer_css_page_size=True,
                                margin={"top": "0in", "bottom": "0in", "left": "0in", "right": "0in"},
                            )
                        except TypeError:
                            # Older Playwright versions may not support prefer_css_page_size
                            page.pdf(
                                path=output_path,
                                print_background=True,
                                margin={"top": "0in", "bottom": "0in", "left": "0in", "right": "0in"},
                            )
                        browser.close()
                        _log("Rendered PDF via Playwright (page.pdf).")
                        return
                    except Exception:
                        # If direct PDF printing fails, fall back to image embedding approach
                        pass

                    # Render to a high-resolution PNG and embed into a PDF using reportlab.
                    with tempfile.NamedTemporaryFile(suffix=".png", delete=False) as tmp:
                        png_path = tmp.name
                    # Use fullPage screenshot to capture entire document; ensure background printed
                    page.screenshot(path=png_path, full_page=True)
                    browser.close()

                    # Create PDF with reportlab sized to 8.5in x 13in and draw the image to fill the page
                    pdf_w = 8.5 * inch
                    pdf_h = 11 * inch
                    c = canvas.Canvas(output_path, pagesize=(pdf_w, pdf_h))
                    try:
                        c.drawImage(png_path, 0, 0, width=pdf_w, height=pdf_h)
                    except Exception as exc:
                        print(f"Failed to draw PNG onto PDF: {exc}")
                    c.save()
                    try:
                        os.remove(png_path)
                    except Exception:
                        pass
                    _log("Rendered PDF via Playwright (screenshot -> reportlab).")
                    return
            except Exception as exc:
                _raise_or_fallback("playwright", exc)

        raise RuntimeError("PDF render failed: no renderer succeeded.")

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
