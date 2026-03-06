from __future__ import annotations

import html
import re
from pathlib import Path
from typing import Any


class CertificateTemplateEngine:
    """Resolves and renders certificate templates from app/templates."""
    DEFAULT_TEMPLATE = "Cert-of-Enrollment-Current.html"
    COMMON_FALLBACKS = (
        "Cert-of-Enrollment-Current.html",
        "Cert-of-Enrollment-Previous.html",
        "Cert-of-ID-Issuance-Current.html",
        "Cert-of-NSTP-Serial-Num.html",
    )
    LEGACY_FILL_PATTERN = r"<span\s+class=\"([^\"]*fill[^\"]*)\"([^>]*)></span>"

    def __init__(self, templates_dir: str | Path | None = None):
        if templates_dir is None:
            templates_dir = Path(__file__).resolve().parents[1] / "templates"
        self.templates_dir = Path(templates_dir)

    def resolve_template_path(self, certificate_type_name: str, context: dict[str, Any] | None = None) -> Path:
        key = self._normalize(certificate_type_name)
        primary = self._resolve_primary_template(key, context or {})
        fallback_candidates = self._build_fallback_candidates(key, primary)

        for candidate in fallback_candidates:
            path = self.templates_dir / candidate
            if self._is_usable_template(path):
                return path

        raise FileNotFoundError(
            f"No usable template found for '{certificate_type_name}'. "
            f"Checked: {', '.join(str(self.templates_dir / item) for item in fallback_candidates)}"
        )

    def render_template(self, template_path: Path, context: dict[str, Any]) -> str:
        raw_html = template_path.read_text(encoding="utf-8")
        if not raw_html.strip():
            raise ValueError(f"Template file is empty: {template_path}")

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
        # Preserve positional mapping (including empty values) so fields do not shift.
        values = ["" if v is None else str(v) for v in context.get("legacy_fill_values", [])]
        index = 0

        def repl(match: re.Match[str]) -> str:
            nonlocal index
            classes = match.group(1)
            extra_attrs = match.group(2) or ""
            if index >= len(values):
                return match.group(0)
            value = html.escape(values[index])
            index += 1
            if value:
                return f"<span class=\"{classes}\"{extra_attrs}>{value}</span>"
            return f"<span class=\"{classes}\"{extra_attrs}></span>"

        return re.sub(self.LEGACY_FILL_PATTERN, repl, text)

    def count_fill_slots(self, template_path: Path) -> int:
        raw_html = template_path.read_text(encoding="utf-8")
        return len(re.findall(self.LEGACY_FILL_PATTERN, raw_html))

    def _resolve_primary_template(self, normalized_type_key: str, context: dict[str, Any]) -> str:
        key = normalized_type_key
        if "coursedescription" in key:
            return "Cert-of-Course-Desc.html"
        if "enrolment" in key or "enrollment" in key:
            return "Cert-of-Enrollment-Current.html"
        if "gradingsystem" in key or "grades" in key:
            return "Cert-of-Grades.html"
        if "graduation" in key:
            has_year = bool(context.get("year_graduated"))
            return "Cert-of-Grad-Has-Graduated.html" if has_year else "Cert-of-Grad-CandidateforGrad.html"
        if "idissuance" in key:
            return "Cert-of-ID-Issuance-Current.html"
        if "nstpserialnumber" in key:
            return "Cert-of-NSTP-Serial-Num.html"
        if "completedacademicrequirements" in key:
            return "Cert-of-Completed-Acad-Req.html"
        if "earnedunits" in key:
            return "Cert-of-Earned-Units.html"
        if "englishmedium" in key:
            return "Cert-of-English-Memorandum.html"
        if "gwa" in key:
            return "Cert-of-GWA.html"
        if "honorgraduate" in key:
            return "Cert-of-Honor-Grad.html"
        if "transfercredentials" in key:
            return "Cert-of-Trans-Credentials.html"
        if "cav" in key or "authenticationandverification" in key:
            return "Cert-of-Trans-Credentials.html"
        return self.DEFAULT_TEMPLATE

    def _build_fallback_candidates(self, normalized_type_key: str, primary_template: str) -> list[str]:
        key = normalized_type_key
        candidates = [primary_template]

        if "graduation" in key or "honorgraduate" in key or "completedacademicrequirements" in key:
            candidates.extend(["Cert-of-Grad-Has-Graduated.html", "Cert-of-Grad-CandidateforGrad.html"])
        elif "grades" in key or "gwa" in key or "earnedunits" in key or "cav" in key or "authenticationandverification" in key:
            candidates.extend(["Cert-of-Grades.html", "Cert-of-Course-Desc.html"])
        elif "enrolment" in key or "enrollment" in key:
            candidates.extend(["Cert-of-Enrollment-Current.html", "Cert-of-Enrollment-Previous.html"])

        candidates.extend(self.COMMON_FALLBACKS)
        return list(dict.fromkeys(candidates))

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

    @staticmethod
    def _is_usable_template(path: Path) -> bool:
        if not path.exists():
            return False
        try:
            return path.stat().st_size > 0
        except OSError:
            return False
