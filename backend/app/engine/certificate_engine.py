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
        "CERTIFICATE_OF_COMPLETED_ACAD_REQUIREMENTS": "certificate_of_completed_acad_requirement.html",
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
    def generate(
        certificate_type: str,
        data: dict,
        rasterize: bool = False,
        output_format: str = "pdf",
    ) -> bytes:
        """
        Generates a PDF certificate from an HTML template using Playwright.
        """
        from jinja2 import Environment, FileSystemLoader, select_autoescape
        import asyncio
        import base64
        import mimetypes
        import sys
        import re
        from io import BytesIO
        from pathlib import Path
        from reportlab.lib.units import inch
        from reportlab.lib.utils import ImageReader
        from reportlab.pdfgen import canvas

        output_format = str(output_format or "pdf").strip().lower()
        if output_format not in {"pdf", "png"}:
            raise ValueError(f"Unsupported output format: {output_format}")

        # ----------------------------------------
        # 1. LOAD TEMPLATE
        # ----------------------------------------
        template_key = CertificateEngine._resolve_certificate_key(
            certificate_type, data
        )
        template_name = CertificateEngine.TEMPLATE_MAP.get(template_key)

        if not template_name:
            raise Exception(
                f"Template not found for certificate type: '{certificate_type}' (resolved key: '{template_key}')"
            )

        env = Environment(
            loader=FileSystemLoader(CertificateEngine.TEMPLATE_DIR),
            autoescape=select_autoescape(["html", "xml"]),
        )
        template = env.get_template(template_name)

        # ----------------------------------------
        # 2. GENERATE QR CODE (BASE64)
        # ----------------------------------------
        verification_code = data.get("verification_code")
        if verification_code:
            verify_url = (
                f"http://localhost:8000/certificates/verify/{verification_code}"
            )
            data["qr_code"] = generate_qr_base64(verify_url)

        # ----------------------------------------
        # 3. RENDER HTML
        # ----------------------------------------
        html_content = template.render(**data)

        # ----------------------------------------
        # 4. GENERATE PDF (Playwright)
        # ----------------------------------------
        def _inject_base_href(html: str, base_href: str) -> str:
            if re.search(r"<\s*base\b", html, flags=re.IGNORECASE):
                return html
            head_match = re.search(r"<\s*head\b[^>]*>", html, flags=re.IGNORECASE)
            if head_match:
                insert_at = head_match.end()
                return f'{html[:insert_at]}\n    <base href="{base_href}">\n{html[insert_at:]}'
            return f'<head><base href="{base_href}"></head>\n{html}'

        def _inline_known_local_images(html: str, base_dir: Path) -> str:
            known = {"batangas_state_logo.png", "bsu.png"}

            def repl(match: re.Match[str]) -> str:
                quote = match.group("q")
                uri = match.group("uri").strip()
                if uri.startswith(("http://", "https://", "data:")):
                    return match.group(0)

                try:
                    raw_path = Path(uri)
                    if raw_path.is_absolute():
                        candidate = raw_path.resolve()
                    else:
                        candidate = (base_dir / uri).resolve()
                except Exception:
                    return match.group(0)

                if not candidate.exists():
                    return match.group(0)
                # allow known logos or any local file path (e.g., signatures)
                if candidate.name.lower() not in known and not candidate.is_file():
                    return match.group(0)

                mime = mimetypes.guess_type(str(candidate))[0] or "image/png"
                try:
                    data = base64.b64encode(candidate.read_bytes()).decode("ascii")
                except Exception:
                    return match.group(0)

                return f"src={quote}data:{mime};base64,{data}{quote}"

            return re.sub(
                r"""src=(?P<q>["'])(?P<uri>[^"']+)(?P=q)""",
                repl,
                html,
                flags=re.IGNORECASE,
            )

        def _extract_page_size_inches(html: str) -> tuple[float, float]:
            match = re.search(
                r"@page\s*\{[^}]*size\s*:\s*([\d.]+)in\s+([\d.]+)in",
                html,
                flags=re.IGNORECASE | re.DOTALL,
            )
            if match:
                return (float(match.group(1)), float(match.group(2)))

            if re.search(
                r"@page\s*\{[^}]*size\s*:\s*legal",
                html,
                flags=re.IGNORECASE | re.DOTALL,
            ):
                return (8.5, 14.0)
            if re.search(
                r"@page\s*\{[^}]*size\s*:\s*letter",
                html,
                flags=re.IGNORECASE | re.DOTALL,
            ):
                return (8.5, 11.0)

            return (8.5, 11.0)

        tpl_dir = Path(CertificateEngine.TEMPLATE_DIR).resolve()
        base_href = tpl_dir.as_uri()
        if not base_href.endswith("/"):
            base_href += "/"
        html_content = _inject_base_href(html_content, base_href)
        html_content = _inline_known_local_images(html_content, tpl_dir)
        page_size_inches = _extract_page_size_inches(html_content)

        # Playwright needs a Proactor event loop on Windows for subprocesses.
        if sys.platform.startswith("win"):
            try:
                policy = asyncio.get_event_loop_policy()
                if not isinstance(policy, asyncio.WindowsProactorEventLoopPolicy):
                    asyncio.set_event_loop_policy(
                        asyncio.WindowsProactorEventLoopPolicy()
                    )
            except Exception:
                pass

        async def _render_pdf_async(
            html: str,
            header_template: str = None,
            rasterize_output: bool = False,
        ) -> bytes:
            from playwright.async_api import async_playwright

            async def _stabilize_page(page) -> None:
                try:
                    await page.wait_for_load_state("networkidle", timeout=10000)
                except Exception:
                    pass

                try:
                    await page.evaluate(
                        """
                        async () => {
                          if (document.fonts && document.fonts.ready) {
                            try { await document.fonts.ready; } catch (_) {}
                          }

                          const images = Array.from(document.images || []);
                          await Promise.all(images.map(async (img) => {
                            try {
                              if (img.complete) {
                                return;
                              }
                              if (typeof img.decode === "function") {
                                await img.decode();
                                return;
                              }
                            } catch (_) {}

                            await new Promise((resolve) => {
                              const done = () => resolve();
                              img.addEventListener("load", done, { once: true });
                              img.addEventListener("error", done, { once: true });
                              setTimeout(done, 3000);
                            });
                          }));
                        }
                        """
                    )
                except Exception:
                    pass

                try:
                    await page.wait_for_timeout(500)
                except Exception:
                    pass

            async with async_playwright() as pw:
                browser = await pw.chromium.launch()
                viewport_width = max(816, int(round(page_size_inches[0] * 96)))
                viewport_height = max(1056, int(round(page_size_inches[1] * 96)))
                context = await browser.new_context(
                    viewport={"width": viewport_width, "height": viewport_height}
                )
                page = await context.new_page()
                await page.set_content(html, wait_until="load")
                await _stabilize_page(page)
                try:
                    await page.emulate_media(media="print")
                except Exception:
                    pass
                await _stabilize_page(page)

                use_header = header_template is not None
                top_margin = "1.8in" if use_header else "0in"

                if output_format == "png":
                    png_bytes = await page.screenshot(type="png", full_page=True)
                    await browser.close()
                    return png_bytes

                if rasterize_output:
                    png_bytes = await page.screenshot(type="png", full_page=True)
                    await browser.close()

                    pdf_buffer = BytesIO()
                    pdf_width = page_size_inches[0] * inch
                    pdf_height = page_size_inches[1] * inch
                    pdf_canvas = canvas.Canvas(
                        pdf_buffer,
                        pagesize=(pdf_width, pdf_height),
                    )
                    pdf_canvas.drawImage(
                        ImageReader(BytesIO(png_bytes)),
                        0,
                        0,
                        width=pdf_width,
                        height=pdf_height,
                    )
                    pdf_canvas.save()
                    return pdf_buffer.getvalue()

                try:
                    pdf_bytes = await page.pdf(
                        print_background=True,
                        prefer_css_page_size=True,
                        display_header_footer=use_header,
                        header_template=header_template or "<div></div>",
                        footer_template="<div></div>",
                        margin={
                            "top": top_margin,
                            "bottom": "0in",
                            "left": "0in",
                            "right": "0in",
                        },
                    )
                except TypeError:
                    pdf_bytes = await page.pdf(
                        print_background=True,
                        margin={
                            "top": top_margin,
                            "bottom": "0in",
                            "left": "0in",
                            "right": "0in",
                        },
                    )
                await browser.close()
                return pdf_bytes

            # After _inline_known_local_images and before _run_async

        def _run_async(coro: asyncio.Future) -> bytes:
            try:
                asyncio.get_running_loop()
            except RuntimeError:
                return asyncio.run(coro)
            from concurrent.futures import ThreadPoolExecutor

            with ThreadPoolExecutor(max_workers=1) as executor:
                return executor.submit(lambda: asyncio.run(coro)).result()

        header_template = None

        return _run_async(
            _render_pdf_async(
                html_content,
                header_template=header_template,
                rasterize_output=rasterize,
            )
        )

    # ------------------------------------------------------------------
    # Internal helpers
    # ------------------------------------------------------------------

    @staticmethod
    def _resolve_certificate_key(certificate_type: str, data: dict) -> str:
        # Check exact match first (handles already-resolved keys from DependencyEngine)
        if certificate_type in CertificateEngine.TEMPLATE_MAP:
            return certificate_type

        normalized = (certificate_type or "").strip().lower()
        resolved = CertificateEngine.TYPE_NAME_ALIASES.get(normalized, certificate_type)
        return CertificateEngine._resolve_versioned_key(resolved, data)

    @staticmethod
    def _resolve_versioned_key(base_key: str, data: dict) -> str:
        if base_key in CertificateEngine.TEMPLATE_MAP:
            return base_key  # Already fully resolved — DO NOT re-version

        key = base_key or ""
        has_v1 = f"{key}_V1" in CertificateEngine.TEMPLATE_MAP
        has_v2 = f"{key}_V2" in CertificateEngine.TEMPLATE_MAP
        if not (has_v1 or has_v2):
            return base_key

        def _is_candidate_from_data(payload: dict) -> bool:
            status = str(payload.get("graduation_status", "") or "").strip().lower()
            if status == "candidate":
                return not bool(payload.get("is_graduated"))
            return False

        def _is_currently_enrolled_from_data(payload: dict) -> bool:
            return bool(payload.get("is_currently_enrolled"))

        if key == "CERTIFICATE_OF_GRADUATION":
            is_candidate = _is_candidate_from_data(data)
            preferred = f"{key}_V1" if is_candidate else f"{key}_V2"
        elif key == "CERTIFICATE_OF_ENROLLMENT":
            is_currently_enrolled = _is_currently_enrolled_from_data(data)
            preferred = f"{key}_V1" if is_currently_enrolled else f"{key}_V2"
        elif key == "CERTIFICATE_OF_ENGLISH_MEDIUM":
            is_candidate = _is_candidate_from_data(data)
            preferred = f"{key}_V1" if is_candidate else f"{key}_V2"
        elif key == "CERTIFICATE_OF_ID_ISSUANCE":
            is_currently_enrolled = _is_currently_enrolled_from_data(data)
            preferred = f"{key}_V1" if is_currently_enrolled else f"{key}_V2"
        else:
            is_graduated = bool(data.get("year_graduated") or data.get("is_graduated"))
            preferred = f"{key}_V2" if is_graduated else f"{key}_V1"

        if preferred in CertificateEngine.TEMPLATE_MAP:
            return preferred
        if has_v2:
            return f"{key}_V2"
        if has_v1:
            return f"{key}_V1"
        return base_key
