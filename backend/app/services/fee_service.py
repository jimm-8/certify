from __future__ import annotations

import math


BASE_CERT_FEE = 30.0
DOCUMENTARY_STAMP_FEE = 30.0
TRANSFER_CREDENTIALS_BASE_FEE = 100.0
TRANSFER_CREDENTIALS_DOC_STAMP_FEE = 60.0

# Adjust these if your templates fit more/less rows per page
ROWS_PER_PAGE = {
    "course_description": 12,
    "grades": 12,
}


def _normalize(text: str | None) -> str:
    return str(text or "").strip().lower()


def is_course_description(cert_name: str | None) -> bool:
    return "course description" in _normalize(cert_name)


def is_certification_of_grades(cert_name: str | None) -> bool:
    return "grades" in _normalize(cert_name)


def is_transfer_credentials(cert_name: str | None) -> bool:
    return "transfer credentials" in _normalize(cert_name)


def _pages_for_rows(row_count: int, rows_per_page: int) -> int:
    if rows_per_page <= 0:
        return 1
    return max(1, int(math.ceil(max(0, row_count) / rows_per_page)))


def compute_request_cost(
    certificate_type_name: str | None,
    row_count: int | None = None,
    pages: int | None = None,
) -> float:
    """
    Pricing rule:
    - Standard certificates: base + documentary stamp (30 + 30)
    - Course Description / Grades: per page (30 + 30) * pages
    - Transfer Credentials: base + two documentary stamps (100 + 60)
    """
    if is_transfer_credentials(certificate_type_name):
        return TRANSFER_CREDENTIALS_BASE_FEE + TRANSFER_CREDENTIALS_DOC_STAMP_FEE

    if is_course_description(certificate_type_name):
        if pages is None:
            rows = row_count if row_count is not None else 1
            pages = _pages_for_rows(rows, ROWS_PER_PAGE["course_description"])
        return (BASE_CERT_FEE + DOCUMENTARY_STAMP_FEE) * pages

    if is_certification_of_grades(certificate_type_name):
        if pages is None:
            rows = row_count if row_count is not None else 1
            pages = _pages_for_rows(rows, ROWS_PER_PAGE["grades"])
        return (BASE_CERT_FEE + DOCUMENTARY_STAMP_FEE) * pages

    return BASE_CERT_FEE + DOCUMENTARY_STAMP_FEE
