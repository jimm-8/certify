import os
import sys

sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from app.services.purpose_service import (
    analyze_request_purpose,
    certificate_purpose_text,
)


def test_analyze_request_purpose_preserves_raw_text_and_classifies():
    result = analyze_request_purpose(
        "  for NEAP educational assistance purposes only  "
    )

    assert result["purpose_raw"] == "for NEAP educational assistance purposes only"
    assert result["purpose_normalized"] == "for neap educational assistance purposes only"
    assert result["purpose_category"] == "SCHOLARSHIP"
    assert result["purpose_extracted_notes"] is None
    assert result["needs_instruction_review"] is False


def test_analyze_request_purpose_flags_scope_sensitive_instruction_review():
    result = analyze_request_purpose(
        "for transfer requirements include only gen ed subjects",
        certificate_type_name="Course Description",
    )

    assert result["purpose_raw"] == (
        "for transfer requirements include only gen ed subjects"
    )
    assert result["purpose_category"] == "TRANSFER"
    assert result["purpose_extracted_notes"] == "gen ed subjects"
    assert result["needs_instruction_review"] is True
    assert "special processing instructions" in result["review_reason"]


def test_analyze_request_purpose_flags_unknown_category_for_review():
    result = analyze_request_purpose("for civil service eligibility only")

    assert result["purpose_category"] == "BOARD_EXAM"
    assert result["needs_instruction_review"] is False
    assert result["review_reason"] is None


def test_analyze_request_purpose_flags_gibberish_for_review():
    result = analyze_request_purpose("sdfghjkl")

    assert result["purpose_category"] == "OTHER"
    assert result["needs_instruction_review"] is True
    assert "gibberish-like" in result["review_reason"]


def test_certificate_purpose_text_uses_category_label_for_shorthand_input():
    assert (
        certificate_purpose_text("for scholar first sem of 3rd year only")
        == "scholarship"
    )


def test_certificate_purpose_text_falls_back_to_cleaned_phrase_for_unknown_input():
    assert (
        certificate_purpose_text("for unclear supporting document reason")
        == "general"
    )
