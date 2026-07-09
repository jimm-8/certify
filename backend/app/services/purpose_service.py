import re
from typing import Any

PURPOSE_CATEGORY_RULES = [
    # Employment / Work
    (
        "EMPLOYMENT",
        (
            "employment",
            "job application",
            "job requirements",
            "work",
            "hiring",
            "pre-employment",
            "pre employment",
            "preemployment",
            "job offer",
            "job posting",
            "career",
            "resume",
            "application for work",
            "apply for work",
            "manpower",
            "agency",
            "company requirement",
            "company requirements",
        ),
    ),
    # Further Studies / Graduate / Post-grad
    (
        "FURTHER_STUDIES",
        (
            "further studies",
            "admission",
            "graduate school",
            "enrollment",
            "post graduate",
            "postgraduate",
            "masteral",
            "doctoral",
            "phd",
            "master's",
            "masters",
            "law school",
            "med school",
            "medicine",
            "college application",
            "university application",
            "continuing education",
            "advanced studies",
            "study abroad",
            "foreign university",
        ),
    ),
    # Scholarship / Financial Aid
    (
        "SCHOLARSHIP",
        (
            "scholarship",
            "scholar",
            "educational assistance",
            "financial assistance",
            "neap",
            "ched",
            "dost",
            "grant",
            "stipend",
            "grantee",
            "beneficiary",
            "study grant",
            "tuition assistance",
            "tuition waiver",
        ),
    ),
    # Board / Licensure Exam
    (
        "BOARD_EXAM",
        (
            "board exam",
            "licensure",
            "prc",
            "license application",
            "professional regulation",
            "bar exam",
            "bar examination",
            "civil service",
            "civil service exam",
            "napolcom",
            "napolcom exam",
            "government exam",
            "qualifying exam",
        ),
    ),
    # Immigration / Visa
    (
        "IMMIGRATION",
        (
            "immigration",
            "visa",
            "embassy",
            "migration",
            "passport",
            "tourist visa",
            "student visa",
            "work visa",
            "working visa",
            "permanent residency",
            "green card",
            "travel clearance",
            "bureau of immigration",
            "consulate",
            "apostille",
        ),
    ),
    # School / University Transfer
    (
        "TRANSFER",
        (
            "transfer",
            "transferring",
            "transfer requirements",
            "transferee",
            "cross-enrollment",
            "cross enrollment",
            "shifting",
            "change of school",
            "inter-school",
            "interschool",
        ),
    ),
    # Vague / General — no specific category determinable
    (
        "GENERAL_USE",
        (
            "general",
            "general purpose",
            "general use",
            "official",
            "official use",
            "official purposes",
            "official purpose",
            "whatever",
            "legal purpose",
            "legal purposes",
            "legal use",
            "any purpose",
            "whatever purpose",
            "lawful",
            "school needed",
            "school and work",
            "school or work",
            "work related",
            "work-related",
            "important matter",
            "important document",
            "important documents",
            "needed transaction",
            "needed lang",
            "immediate needed",
            "application needed",
            "for application",
            "documentation",
            "document purposes",
            "document purpose",
            "records purposes",
            "records purpose",
            "personal purposes",
            "personal po",
            "supporting document",
            "supporting documents",
        ),
    ),
    # Personal Copy / Record
    (
        "PERSONAL_RECORD",
        (
            "personal record",
            "personal copy",
            "personal use",
            "personal file",
            "personal reference",
            "own copy",
            "own use",
            "own record",
            "my record",
            "for reference",
            "for safekeeping",
            "file copy",
            "future reference",
            "future references",
            "future use",
            "future used",
            "for reference",
            "verification",
            "verify",
        ),
    ),
    # Government / Legal / Compliance
    (
        "GOVERNMENT",
        (
            "government",
            "government requirement",
            "government transaction",
            "lgu",
            "nbi",
            "nbi clearance",
            "police clearance",
            "barangay",
            "sss",
            "gsis",
            "pagibig",
            "pag-ibig",
            "philhealth",
            "bir",
            "tax",
            "tin",
            "court",
            "legal",
            "compliance",
            "public office",
            "deped",
        ),
    ),
    # Bank / Financial Institution
    (
        "BANK",
        (
            "bank",
            "banking",
            "bank requirement",
            "loan",
            "loan application",
            "credit",
            "credit application",
            "financial institution",
        ),
    ),
    # Medical / Hospital
    (
        "MEDICAL",
        (
            "medical",
            "hospital",
            "clinic",
            "health",
            "medical requirement",
            "medical application",
            "residency training",
            "hospital training",
            "internship",
            "medical internship",
        ),
    ),
    # Military / Police
    (
        "MILITARY",
        (
            "military",
            "afp",
            "pnp",
            "police",
            "coast guard",
            "army",
            "navy",
            "air force",
            "armed forces",
            "rotc",
            "military service",
        ),
    ),
]

PURPOSE_CATEGORY_LABELS = {
    "EMPLOYMENT": "employment",
    "FURTHER_STUDIES": "further studies",
    "SCHOLARSHIP": "scholarship",
    "BOARD_EXAM": "board examination",
    "IMMIGRATION": "immigration",
    "TRANSFER": "transfer",
    "PERSONAL_RECORD": "personal record",
    "GOVERNMENT": "government transaction",
    "BANK": "bank requirement",
    "MEDICAL": "medical purposes",
    "MILITARY": "military service",
    "GENERAL_USE": "",
    "OTHER": "",
}

INSTRUCTION_MARKERS = (
    # Scope / filter keywords
    "only",
    "include",
    "including",
    "excluding",
    "except",
    "without",
    "with",
    # Subject-area keywords
    "gen ed",
    "general education",
    "major subjects",
    "major subject",
    "minor subjects",
    "minor subject",
    "core subjects",
    "elective",
    "electives",
    "all subjects",
    "specific subjects",
    # Time/range keywords
    "per semester",
    "per year",
    "per school year",
    "first semester",
    "second semester",
    "summer",
    "from",
    "to",
    "ay ",  # "AY 2022-2023"
    "s.y.",
    "school year",
    "academic year",
    # Formatting instructions
    "separate",
    "combined",
    "per page",
    "per copy",
    "attested",
    "authenticated",
    "certified true copy",
)

# Fallback phrase inserted by templates as:
# "...for {request_purpose} purposes only."
GENERAL_FALLBACK_PHRASE = "general"

# ---------------------------------------------------------------------------
# Tagalog / Taglish keyword -> category mapping.
# Checked as a secondary pass when primary English rules return OTHER.
# ---------------------------------------------------------------------------
TAGALOG_KEYWORD_CATEGORY_MAP: list[tuple[str, tuple]] = [
    (
        "EMPLOYMENT",
        (
            "trabaho",
            "magtrabaho",
            "apply trabaho",
            "pang trabaho",
            "hanap trabaho",
            "hanapbuhay",
            "employer",
            "kumpanya",
            "opisina",
            "ofw",
            "ojt",
            "on-the-job",
            "on the job",
            "practicum",
            "internship",
            "training",
            "apprenticeship",
        ),
    ),
    (
        "FURTHER_STUDIES",
        (
            "pag-aaral",
            "pagaaral",
            "pag aaral",
            "pag-aral",
            "pag aral",
            "enroll",
            "mag-enroll",
            "next sem",
            "susunod na sem",
            "semestre",
            "kolehiyo",
            "kolehyo",
            "unibersidad",
            "kurso",
            "klase",
        ),
    ),
    (
        "SCHOLARSHIP",
        (
            "iskolar",
            "tulong pinansyal",
            "educational assistance",
        ),
    ),
    (
        "BOARD_EXAM",
        (
            "pagsusulit",
            "eksam",
            "civil service exam",
        ),
    ),
    (
        "IMMIGRATION",
        (
            "passport",
            "ibang bansa",
            "abroad",
            "apostille",
        ),
    ),
    (
        "TRANSFER",
        (
            "lilipat",
            "lumipat",
            "palipat",
            "ibang eskwela",
            "ibang school",
            "bagong school",
        ),
    ),
    (
        "PERSONAL_RECORD",
        (
            "nawala",
            "naiwala",
            "kopya",
            "kopya ko",
            "copy ko",
            "sariling kopya",
            "para sa akin",
            "mama ko",
            "papa ko",
            "nanay ko",
            "tatay ko",
            "magulang",
            "guardian",
            "safekeeping",
        ),
    ),
    (
        "GOVERNMENT",
        (
            "requirement",
            "requirements",
            "req",
            "reqs",
            "clearance",
            "barangay",
            "pulis",
            "compliance",
            "dokumento",
            "dokument",
        ),
    ),
    (
        "MEDICAL",
        (
            "ospital",
            "klinika",
            "doktor",
            "medikal",
        ),
    ),
]


def _to_str(value: Any) -> str:
    """Safely coerce any value to a plain string, stripping surrogates and null bytes."""
    if value is None:
        return ""
    try:
        text = str(value)
    except Exception:
        return ""
    # Remove null bytes and lone surrogates that break regex on some platforms.
    text = text.replace("\x00", "")
    try:
        text = text.encode("utf-8", errors="ignore").decode("utf-8", errors="ignore")
    except Exception:
        pass
    return text


def sanitize_purpose_text(value: Any) -> str:
    text = _to_str(value).strip()
    try:
        return re.sub(r"\s+", " ", text)
    except Exception:
        return text


def normalize_purpose_text(value: Any) -> str:
    try:
        return sanitize_purpose_text(value).lower()
    except Exception:
        return _to_str(value).lower()


def purpose_category_label(category: Any) -> str:
    try:
        key = _to_str(category).strip().upper()
        return PURPOSE_CATEGORY_LABELS.get(key, "")
    except Exception:
        return ""


def classify_purpose(normalized_text: str) -> str:
    try:
        # Primary pass: English rules.
        for category, keywords in PURPOSE_CATEGORY_RULES:
            if any(keyword in normalized_text for keyword in keywords):
                return category
        # Secondary pass: Tagalog / Taglish rules.
        for category, keywords in TAGALOG_KEYWORD_CATEGORY_MAP:
            if any(keyword in normalized_text for keyword in keywords):
                return category
    except Exception:
        pass
    return "OTHER"


def detect_suspicious_purpose_text(cleaned_text: Any) -> bool:
    try:
        text = _to_str(cleaned_text)
        if not text:
            return False

        alpha_only = re.sub(r"[^A-Za-z]", "", text)
        if len(alpha_only) >= 6:
            vowel_count = sum(1 for ch in alpha_only.lower() if ch in "aeiou")
            if vowel_count == 0:
                return True

        alpha_tokens = re.findall(r"[A-Za-z]+", text.lower())
        if alpha_tokens and all(len(t) >= 4 for t in alpha_tokens):
            if all(not re.search(r"[aeiou]", t) for t in alpha_tokens):
                return True
    except Exception:
        pass
    return False


def normalize_purpose_for_certificate(raw_purpose: Any) -> str:
    """
    Produce a grammatically clean purpose phrase suitable for insertion into:

        "...for {phrase} purposes only."

    Rules applied (in order):
    1. Strip leading "for"/"for the purpose of"/known filler verbs.
    2. Strip trailing "purposes only", "only", "purpose", bare punctuation.
    3. Collapse internal whitespace.
    4. Title-case multi-word phrases; keep known acronyms uppercased.
    5. Strip stray leading/trailing punctuation one final time.

    NOTE: This function is purely for display/grammar — it does NOT classify.
          Classification is done on the original normalized text BEFORE stripping.
    """
    # Known acronyms that must stay uppercased.
    ACRONYMS = {
        "PRC",
        "NBI",
        "BIR",
        "SSS",
        "GSIS",
        "CHED",
        "DOST",
        "NEAP",
        "AFP",
        "PNP",
        "LGU",
        "TIN",
        "ROTC",
        "NAPOLCOM",
    }

    try:
        text = sanitize_purpose_text(raw_purpose)
        if not text:
            return ""

        # 1. Strip leading filler phrases.
        text = re.sub(
            r"^(this\s+is\s+)?for\s+(the\s+)?(purpose\s+of\s+)?",
            "",
            text,
            flags=re.IGNORECASE,
        )
        # "issued for X", "requested for X", "needed for X" — only strip known filler verbs.
        text = re.sub(
            r"^(?:issued|requested|needed|required|prepared|submitted|used)\s+for\s+",
            "",
            text,
            flags=re.IGNORECASE,
        )

        # 2. Strip trailing noise.
        text = re.sub(r"\s+purposes?\s+only\.?$", "", text, flags=re.IGNORECASE)
        text = re.sub(r"\s+purposes?\.?$", "", text, flags=re.IGNORECASE)
        text = re.sub(r"\s+only\.?$", "", text, flags=re.IGNORECASE)
        text = re.sub(r"\s+purpose\.?$", "", text, flags=re.IGNORECASE)

        # 3. Collapse whitespace.
        text = re.sub(r"\s+", " ", text).strip(" ,;:.")

        if not text:
            return ""

        # 4. Title-case each word, but restore known acronyms.
        def _title_word(word: str) -> str:
            upper = word.upper()
            if upper in ACRONYMS:
                return upper
            # Preserve hyphenated words: "pre-employment" → "Pre-Employment"
            if "-" in word:
                return "-".join(p.capitalize() for p in word.split("-"))
            return word.capitalize()

        text = " ".join(_title_word(w) for w in text.split())

        # 5. Final punctuation cleanup.
        text = text.strip(" ,;:.")

        return text
    except Exception:
        return _to_str(raw_purpose)


def certificate_purpose_text(
    purpose: Any,
    purpose_category: Any = None,
) -> str:
    """
    Return the purpose phrase ready for insertion into a certificate sentence:

        "...for {certificate_purpose_text(...)} purposes only."

    Strategy:
    - If purpose_category is explicitly provided, use its canonical label.
    - Otherwise classify against the FULL original text (before any stripping),
      so keywords like "pre-employment" inside "needed for pre-employment" are found.
    - If still OTHER, fall back to grammar-normalized display text.
    """
    try:
        cleaned_text = sanitize_purpose_text(purpose)
        normalized_text = normalize_purpose_text(cleaned_text)

        # Explicit category overrides everything.
        explicit_cat = _to_str(purpose_category).strip().upper()
        category = explicit_cat or classify_purpose(normalized_text)

        label = purpose_category_label(category)
        if label:
            return label

        # GENERAL_USE or OTHER — use a generic phrase that keeps the
        # surrounding template grammar valid: "for general purposes only".
        if category in ("GENERAL_USE", "OTHER"):
            return GENERAL_FALLBACK_PHRASE

        # Remaining unknown category — normalize the raw text for clean certificate output.
        return normalize_purpose_for_certificate(cleaned_text) or cleaned_text
    except Exception:
        return _to_str(purpose)


def _split_purpose_and_notes(cleaned_text: str) -> tuple[str, str | None]:
    separators = [
        " only need ",
        " include only ",
        " excluding ",
        " except ",
        " include ",
        " for ",
    ]
    try:
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
    except Exception:
        pass
    return cleaned_text, None


def detect_instruction_review(
    normalized_text: Any,
    certificate_type_name: Any = None,
    requested_document_name: Any = None,
) -> bool:
    try:
        request_label = normalize_purpose_text(
            certificate_type_name or requested_document_name
        )
        is_scope_sensitive = (
            "grade" in request_label or "course description" in request_label
        )
        text = _to_str(normalized_text)
        return is_scope_sensitive and any(
            marker in text for marker in INSTRUCTION_MARKERS
        )
    except Exception:
        return False


def analyze_request_purpose(
    purpose: Any,
    *,
    certificate_type_name: Any = None,
    requested_document_name: Any = None,
) -> dict[str, str | bool | None]:
    try:
        cleaned_text = sanitize_purpose_text(purpose)
        normalized_text = normalize_purpose_text(cleaned_text)
        purpose_text, extracted_notes = _split_purpose_and_notes(cleaned_text)
        normalized_purpose = normalize_purpose_text(purpose_text)
        # Classify against the full original text so keywords inside
        # "needed for pre-employment" or "requested for X purposes" are found.
        purpose_category = classify_purpose(normalized_text)
        if purpose_category == "OTHER":
            purpose_category = classify_purpose(normalized_purpose)
        suspicious_purpose = detect_suspicious_purpose_text(cleaned_text)
        scope_review = detect_instruction_review(
            normalized_text,
            certificate_type_name=certificate_type_name,
            requested_document_name=requested_document_name,
        )

        review_reasons = []
        if purpose_category == "OTHER":
            review_reasons.append("Purpose could not be matched to a known category.")
        if suspicious_purpose:
            review_reasons.append("Purpose text appears suspicious or gibberish-like.")
        if scope_review:
            review_reasons.append(
                "Purpose includes special processing instructions that require manual review."
            )

        certificate_phrase = certificate_purpose_text(cleaned_text, purpose_category)

        return {
            "purpose_raw": cleaned_text,
            "purpose_normalized": normalized_purpose,
            "purpose_category": purpose_category,
            "purpose_extracted_notes": extracted_notes,
            "purpose_certificate_phrase": certificate_phrase,
            "needs_instruction_review": bool(review_reasons),
            "review_reason": " ".join(review_reasons) if review_reasons else None,
        }
    except Exception:
        # Last-resort fallback: return a safe, reviewable result rather than raising.
        raw = _to_str(purpose)
        return {
            "purpose_raw": raw,
            "purpose_normalized": raw.lower(),
            "purpose_category": "OTHER",
            "purpose_extracted_notes": None,
            "purpose_certificate_phrase": GENERAL_FALLBACK_PHRASE,
            "needs_instruction_review": True,
            "review_reason": "An unexpected error occurred during purpose analysis.",
        }
