import re


PURPOSE_CATEGORY_RULES = [
    ("EMPLOYMENT", ("employment", "job application", "job requirements", "work")),
    ("FURTHER_STUDIES", ("further studies", "admission", "graduate school", "enrollment")),
    ("SCHOLARSHIP", ("scholarship", "scholar", "educational assistance", "financial assistance", "neap")),
    ("BOARD_EXAM", ("board exam", "licensure", "prc", "license application")),
    ("IMMIGRATION", ("immigration", "visa", "embassy", "migration")),
    ("TRANSFER", ("transfer", "transferring", "transfer requirements")),
    ("PERSONAL_RECORD", ("personal record", "personal copy", "personal use")),
]

PURPOSE_CATEGORY_LABELS = {
    "EMPLOYMENT": "employment",
    "FURTHER_STUDIES": "further studies",
    "SCHOLARSHIP": "scholarship",
    "BOARD_EXAM": "board examination",
    "IMMIGRATION": "immigration",
    "TRANSFER": "transfer",
    "PERSONAL_RECORD": "personal record",
    "OTHER": "",
}

INSTRUCTION_MARKERS = (
    "only",
    "include",
    "excluding",
    "except",
    "gen ed",
    "general education",
    "major subjects",
    "minor subjects",
    "per semester",
    "from",
    "to",
    "all subjects",
)


def sanitize_purpose_text(value: str | None) -> str:
    text = str(value or "").strip()
    return re.sub(r"\s+", " ", text)


def normalize_purpose_text(value: str | None) -> str:
    return sanitize_purpose_text(value).lower()


def purpose_category_label(category: str | None) -> str:
    return PURPOSE_CATEGORY_LABELS.get(str(category or "").strip().upper(), "")


def classify_purpose(normalized_text: str) -> str:
    for category, keywords in PURPOSE_CATEGORY_RULES:
        if any(keyword in normalized_text for keyword in keywords):
            return category
    return "OTHER"


def certificate_purpose_text(
    purpose: str | None,
    purpose_category: str | None = None,
) -> str:
    cleaned_text = sanitize_purpose_text(purpose)
    normalized_text = normalize_purpose_text(cleaned_text)
    category = str(purpose_category or "").strip().upper() or classify_purpose(
        normalized_text
    )

    label = purpose_category_label(category)
    if label:
        return label

    fallback = re.sub(
        r"^(for\s+)+",
        "",
        cleaned_text,
        flags=re.IGNORECASE,
    )
    fallback = re.sub(
        r"\s+purposes?\s+only\.?$",
        "",
        fallback,
        flags=re.IGNORECASE,
    )
    fallback = fallback.strip(" ,;:.")
    return fallback or cleaned_text


def _split_purpose_and_notes(cleaned_text: str) -> tuple[str, str | None]:
    separators = [
        " only need ",
        " include only ",
        " excluding ",
        " except ",
        " include ",
        " for ",
    ]
    lowered = cleaned_text.lower()

    for separator in separators:
        index = lowered.find(separator)
        if index <= 0:
            continue

        purpose = cleaned_text[:index].strip(" ,;:-")
        notes = cleaned_text[index + len(separator) :].strip(" ,;:-")

        if purpose and notes:
            if separator.strip() == "for":
                notes = f"for {notes}"
            return purpose, notes

    return cleaned_text, None


def detect_instruction_review(
    normalized_text: str,
    certificate_type_name: str | None = None,
    requested_document_name: str | None = None,
) -> bool:
    request_label = normalize_purpose_text(
        certificate_type_name or requested_document_name
    )
    is_scope_sensitive_request = (
        "grade" in request_label or "course description" in request_label
    )
    return is_scope_sensitive_request and any(
        marker in normalized_text for marker in INSTRUCTION_MARKERS
    )


def analyze_request_purpose(
    purpose: str | None,
    *,
    certificate_type_name: str | None = None,
    requested_document_name: str | None = None,
) -> dict[str, str | bool | None]:
    cleaned_text = sanitize_purpose_text(purpose)
    normalized_text = normalize_purpose_text(cleaned_text)
    purpose_text, extracted_notes = _split_purpose_and_notes(cleaned_text)
    normalized_purpose = normalize_purpose_text(purpose_text)

    return {
        "purpose_raw": cleaned_text,
        "purpose_normalized": normalized_purpose,
        "purpose_category": classify_purpose(normalized_purpose),
        "purpose_extracted_notes": extracted_notes,
        "needs_instruction_review": detect_instruction_review(
            normalized_text,
            certificate_type_name=certificate_type_name,
            requested_document_name=requested_document_name,
        ),
    }
