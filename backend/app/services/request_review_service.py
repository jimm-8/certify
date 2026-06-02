from __future__ import annotations

from datetime import datetime
import re
from typing import Optional

from app.certificate_dependencies import normalize_certificate_name
from app.models.certificate_request import CertificateRequest
from app.repositories import (
    GraduationRecordRepository,
    ProgramRepository,
    StudentRepository,
)

SUPPORTED_RECORDS_START_YEAR = 2018


def extract_graduation_year(record) -> int | None:
    if record is None:
        return None

    for value in (
        getattr(record, "date_of_graduation", None),
        getattr(record, "proposed_graduation_date", None),
        getattr(record, "academic_year", None),
    ):
        if not value:
            continue

        match = re.search(r"\b(19|20)\d{2}\b", str(value))
        if match:
            return int(match.group(0))

    return None


def is_graduation_related_certificate(certificate_type_name: Optional[str]) -> bool:
    normalized = str(certificate_type_name or "").strip().lower()
    if not normalized:
        return False

    keywords = (
        "graduation",
        "honor graduate",
        "completed academic requirement",
    )
    return any(keyword in normalized for keyword in keywords)


def is_gwa_certificate(certificate_type_name: Optional[str]) -> bool:
    normalized = normalize_certificate_name(certificate_type_name or "")
    return normalized in {
        "certificationofgwa",
        "certificateofgwa",
    }


def is_honor_graduate_certificate(certificate_type_name: Optional[str]) -> bool:
    normalized = normalize_certificate_name(certificate_type_name or "")
    return normalized == "certificationofhonorgraduate"


def is_cav_certificate(certificate_type_name: Optional[str]) -> bool:
    normalized = normalize_certificate_name(certificate_type_name or "")
    return normalized in {
        "certificationauthenticationandverification",
        "certificationauthenticationandverificationcav",
    }


def normalize_name(name: Optional[str]) -> str:
    if not name:
        return ""
    cleaned = " ".join(str(name).replace(",", " ").split())
    return cleaned.strip().lower()


def tokenize_name(name: Optional[str]) -> list[str]:
    if not name:
        return []
    return [tok.lower() for tok in re.findall(r"[A-Za-z]+", str(name))]


def is_invalid_text(value: Optional[str]) -> bool:
    if value is None:
        return False
    text = str(value).strip()
    if not text:
        return False

    if re.search(r"[<>`{}\[\]|\\]", text):
        return True

    if re.search(r"[^A-Za-z0-9 .,'\-/#@&()_+:?/]", text):
        return True

    alpha_only = re.sub(r"[^A-Za-z]", "", text)
    if len(alpha_only) >= 6:
        vowel_count = sum(1 for c in alpha_only.lower() if c in "aeiou")
        if vowel_count == 0:
            return True

    return False


def add_invalid_flags(request_obj: CertificateRequest, flags_list: list[str]) -> None:
    fields = [
        ("requestor_name", "Requestor name"),
        ("requestor_address", "Requestor address"),
        ("requestor_relationship", "Requestor relationship"),
        ("requestor_contact", "Requestor contact"),
        ("requestor_email", "Requestor email"),
        ("purpose", "Purpose"),
        ("sr_code", "SR code"),
        ("student_name", "Student name"),
        ("program", "Program"),
        ("major", "Major"),
        ("year_graduated", "Year graduated"),
    ]
    for attr, label in fields:
        if is_invalid_text(getattr(request_obj, attr, None)):
            flags_list.append(f"Invalid input detected in {label}.")


def get_request_validation_flags(db, request: CertificateRequest) -> list[str]:
    student_repo = StudentRepository(db)
    program_repo = ProgramRepository(db)
    graduation_repo = GraduationRecordRepository(db)
    current_year = datetime.now().year

    flags: list[str] = []
    add_invalid_flags(request, flags)

    sr_code = (request.sr_code or "").strip()
    student = student_repo.get_by_sr_code(sr_code) if sr_code else None
    if student is None and request.student_name:
        student = student_repo.get_by_student_name(request.student_name)

    if not student:
        flags.append("Student record not found in registry.")
    else:
        if sr_code and student.sr_code and sr_code != student.sr_code:
            flags.append(f"SR code does not match registry record ({student.sr_code}).")

        req_name = normalize_name(request.student_name)
        student_name = normalize_name(
            f"{student.first_name or ''} {student.middle_name or ''} {student.last_name or ''}"
        )
        if req_name and student_name:
            req_tokens = set(tokenize_name(request.student_name))
            student_tokens = (
                tokenize_name(student.first_name)
                + tokenize_name(student.middle_name)
                + tokenize_name(student.last_name)
            )
            matches = sum(1 for tok in set(student_tokens) if tok in req_tokens)
            if matches < 2:
                flags.append("Student name does not match registry.")

        if request.program and student.program and student.program.name:
            if normalize_name(request.program) != normalize_name(student.program.name):
                flags.append("Program does not match registry.")

    campus = None
    if student is not None:
        campus = student.campus or (student.program.campus if student.program else None)
    if campus is None and request.program:
        program = program_repo.get_by_name(request.program)
        campus = program.campus if program else None

    if campus is None:
        flags.append("Campus could not be verified.")

    grad_record = None
    lookup_sr_code = sr_code or (student.sr_code if student is not None else "")
    if lookup_sr_code:
        grad_record = graduation_repo.get_by_sr_code(lookup_sr_code)
    if grad_record is None and request.student_name:
        grad_record = graduation_repo.get_by_student_name(request.student_name)

    if request.year_graduated:
        year_text = str(request.year_graduated).strip()
        if not re.fullmatch(r"\d{4}", year_text):
            flags.append("Year graduated must be a 4-digit year.")
        else:
            year_value = int(year_text)
            if year_value > current_year:
                flags.append(f"Graduation year cannot be later than {current_year}.")
            if year_value < SUPPORTED_RECORDS_START_YEAR:
                flags.append(
                    f"Graduation year is outside the supported in-system range before {SUPPORTED_RECORDS_START_YEAR}."
                )
            if grad_record is not None and not grad_record.is_graduated:
                flags.append("Student is not yet graduated.")
            else:
                recorded_year = extract_graduation_year(grad_record)
                if (
                    grad_record is not None
                    and recorded_year is not None
                    and year_value != recorded_year
                ):
                    flags.append(
                        f"Graduation year does not match registry record ({recorded_year})."
                    )

    if is_gwa_certificate(request.certificate_type_name):
        if grad_record is None:
            flags.append(
                "No graduation record found for this student for the requested GWA certificate."
            )
        elif not grad_record.is_graduated:
            flags.append("Student is not yet graduated for the requested GWA certificate.")

    if is_honor_graduate_certificate(request.certificate_type_name):
        if grad_record is None:
            flags.append(
                "No graduation record found for this student for the requested honor graduate certificate."
            )
        elif not grad_record.is_graduated:
            flags.append(
                "Student is not yet graduated for the requested honor graduate certificate."
            )
        elif not str(getattr(grad_record, "latin_honor", "") or "").strip():
            flags.append(
                "No latin honor record found for this student for the requested honor graduate certificate."
            )

    if is_cav_certificate(request.certificate_type_name):
        if grad_record is None:
            flags.append(
                "No graduation record found for this student for the requested CAV certificate."
            )
        elif not grad_record.is_graduated:
            flags.append("Student is not yet graduated for the requested CAV certificate.")

    if (
        is_graduation_related_certificate(request.certificate_type_name)
        and not is_gwa_certificate(request.certificate_type_name)
        and not is_honor_graduate_certificate(request.certificate_type_name)
        and grad_record is None
    ):
        flags.append("No graduation record found for this student for the requested certificate.")

    return flags


def request_requires_manual_review(db, request: CertificateRequest) -> bool:
    if getattr(request, "needs_instruction_review", False):
        return True
    return len(get_request_validation_flags(db, request)) > 0
