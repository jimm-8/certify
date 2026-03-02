from __future__ import annotations

import html
import re
from pathlib import Path
from typing import Any


class CertificateTemplateEngine:
    """Resolves and renders certificate templates from app/templates."""

    def __init__(self, templates_dir: str | Path | None = None):
        if templates_dir is None:
            templates_dir = Path(__file__).resolve().parents[1] / "templates"
        self.templates_dir = Path(templates_dir)

    def resolve_template_path(self, certificate_type_name: str, context: dict[str, Any] | None = None) -> Path:
        key = self._normalize(certificate_type_name)

        if "coursedescription" in key:
            filename = "Cert-of-Course-Desc.html"
        elif "enrolment" in key or "enrollment" in key:
            filename = "Cert-of-Enrollment-Current.html"
        elif "gradingsystem" in key:
            filename = "Cert-of-Grades.html"
        elif "graduation" in key:
            has_year = bool((context or {}).get("year_graduated"))
            filename = "Cert-of-Grad-Has-Graduated.html" if has_year else "Cert-of-Grad-CandidateforGrad.html"
        elif "idissuance" in key:
            filename = "Cert-of-ID-Issuance-Current.html"
        elif "nstpserialnumber" in key:
            filename = "Cert-of-NSTP-Serial-Num.html"
        elif "completedacademicrequirements" in key:
            filename = "Cert-of-Completed-Acad-Req.html"
        elif "earnedunits" in key:
            filename = "Cert-of-Earned-Units.html"
        elif "englishmedium" in key:
            filename = "Cert-of-English-Memorandum.html"
        elif "gwa" in key:
            filename = "Cert-of-GWA.html"
        elif "grades" in key:
            filename = "Cert-of-Grades.html"
        elif "honorgraduate" in key:
            filename = "Cert-of-Honor-Grad.html"
        elif "cav" in key or "authenticationandverification" in key:
            filename = "Cert-of-Trans-Credentials.html"
        else:
            filename = "Cert-of-Enrollment-Current.html"

        path = self.templates_dir / filename
        if not path.exists():
            raise FileNotFoundError(f"Template file not found: {path}")
        return path

    def render_template(self, template_path: Path, context: dict[str, Any]) -> str:
        raw_html = template_path.read_text(encoding="utf-8")

        rendered = self._replace_curly_placeholders(raw_html, context)
        rendered = self._replace_legacy_fill_lines(rendered, context)

        rendered = rendered.replace("Name of Campus", html.escape(str(context.get("campus_name", "Alangilan Campus"))))
        rendered = rendered.replace("Campus Address", html.escape(str(context.get("campus_address", "Golden Country Homes, Alangilan, Batangas City"))))
        rendered = rendered.replace("Telephone Number", html.escape(str(context.get("campus_contact", "(+63) 43 425 0139"))))
        rendered = rendered.replace("E-mail Address | Website Address", html.escape(str(context.get("campus_email_website", "registrar@g.batstate-u.edu.ph | batstate-u.edu.ph"))))

        return rendered

    def extract_render_content(self, rendered_html: str) -> tuple[list[str], str, list[str], str]:
        header_lines: list[str] = []
        republic = self._find_first_text(rendered_html, "republic")
        university = self._find_first_text(rendered_html, "university")
        subtitle = self._find_first_text(rendered_html, "subtitle")
        details = self._find_all_text(rendered_html, "details")
        title = self._find_first_text(rendered_html, "cert-title")
        footer = self._find_first_text(rendered_html, "footer-note")

        for line in [republic, university, subtitle, *details]:
            if line:
                header_lines.append(line)

        if not title:
            raise ValueError("Template parsing failed: missing .cert-title in HTML template")

        section_titles = self._find_all_text(rendered_html, "section-title")
        paragraphs = self._find_all_text(rendered_html, "paragraph")

        body_lines: list[str] = []
        for section in section_titles:
            if section:
                body_lines.append(section)
        for paragraph in paragraphs:
            if paragraph:
                body_lines.append(paragraph)

        if not body_lines:
            raise ValueError("Template parsing failed: no .section-title/.paragraph content found")

        return header_lines, title, body_lines, footer

    def _replace_curly_placeholders(self, text: str, context: dict[str, Any]) -> str:
        pattern = re.compile(r"\{\{\s*([a-zA-Z0-9_\.]+)\s*\}\}")

        def repl(match: re.Match[str]) -> str:
            key = match.group(1)
            value = self._deep_get(context, key)
            return html.escape("" if value is None else str(value))

        return pattern.sub(repl, text)

    def _replace_legacy_fill_lines(self, text: str, context: dict[str, Any]) -> str:
        values = [str(v) for v in context.get("legacy_fill_values", []) if v not in (None, "")]
        index = 0

        def repl(match: re.Match[str]) -> str:
            nonlocal index
            if index >= len(values):
                return match.group(0)
            value = html.escape(values[index])
            index += 1
            return f"<span class=\"fill-text\">{value}</span>"

        return re.sub(r"<span\s+class=\"fill[^\"]*\"\s*></span>", repl, text)

    @staticmethod
    def _find_first_text(text: str, class_name: str) -> str:
        match = re.search(
            rf"<[^>]*class=\"[^\"]*{re.escape(class_name)}[^\"]*\"[^>]*>(.*?)</[^>]+>",
            text,
            flags=re.IGNORECASE | re.DOTALL,
        )
        if not match:
            return ""
        return CertificateTemplateEngine._clean_text(match.group(1))

    @staticmethod
    def _find_all_text(text: str, class_name: str) -> list[str]:
        matches = re.findall(
            rf"<[^>]*class=\"[^\"]*{re.escape(class_name)}[^\"]*\"[^>]*>(.*?)</[^>]+>",
            text,
            flags=re.IGNORECASE | re.DOTALL,
        )
        return [CertificateTemplateEngine._clean_text(item) for item in matches if CertificateTemplateEngine._clean_text(item)]

    @staticmethod
    def _clean_text(text: str) -> str:
        without_tags = re.sub(r"<[^>]+>", " ", text)
        without_entities = html.unescape(without_tags)
        return re.sub(r"\s+", " ", without_entities).strip()

    @staticmethod
    def _normalize(value: str) -> str:
        return re.sub(r"[^a-z0-9]+", "", (value or "").lower())

    @staticmethod
    def _deep_get(data: dict[str, Any], key: str) -> Any:
        current: Any = data
        for part in key.split("."):
            if isinstance(current, dict):
                current = current.get(part)
            else:
                return None
        return current
