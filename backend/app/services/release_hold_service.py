from __future__ import annotations

from datetime import datetime
from typing import Optional

from sqlalchemy.orm import Session

from app.models.certificate_request import CertificateRequest, RequestStatus
from app.repositories import ProgramRepository, StudentRepository
from app.services.audit_service import log_action
from app.services.email_service import EmailService
from app.services.settings_service import (
    get_bool_setting,
    get_setting,
    set_bool_setting,
)


SIGNING_AVAILABLE_SETTING_KEY = "signing_available_for_release"
SIGNATORY_UNAVAILABLE_HOLD_SOURCE = "signatory_unavailable"
REQUESTOR_NO_PICKUP_HOLD_SOURCE = "requestor_no_pickup"
MANUAL_DELAY_NOTICE_HOLD_SOURCE = "manual_delay_notice"
PAYMENT_AWAITING_HOLD_SOURCE = "awaiting_payment"
DEFAULT_SIGNATORY_DELAY_REASON = (
    "The authorized signatory is currently unavailable. "
    "We will process your certificate promptly once signing resumes."
)
DEFAULT_REQUESTOR_NO_PICKUP_REASON = (
    "The requestor did not pick up the certificate. "
    "Release timing is paused until pickup resumes."
)
DEFAULT_PAYMENT_AWAITING_REASON = (
    "Payment is pending. Processing timing is paused until payment is recorded."
)


def get_signing_available(db: Session) -> bool:
    raw_value = get_setting(db, SIGNING_AVAILABLE_SETTING_KEY)
    if raw_value is None:
        set_bool_setting(db, SIGNING_AVAILABLE_SETTING_KEY, True)
        db.commit()
        return True
    return get_bool_setting(db, SIGNING_AVAILABLE_SETTING_KEY, True)


def set_signing_available(db: Session, value: bool) -> None:
    set_bool_setting(db, SIGNING_AVAILABLE_SETTING_KEY, value)


def _resolve_now(reference: Optional[datetime] = None) -> datetime:
    if reference and reference.tzinfo is not None:
      return datetime.now(reference.tzinfo)
    return datetime.now()


def get_request_hold_seconds(
    request: CertificateRequest,
    now: Optional[datetime] = None,
) -> int:
    total_seconds = int(getattr(request, "release_hold_total_seconds", 0) or 0)
    if getattr(request, "release_hold_active", False) and getattr(
        request, "release_hold_started_at", None
    ):
        current_now = now or _resolve_now(request.release_hold_started_at)
        try:
            total_seconds += max(
                0,
                int(
                    (current_now - request.release_hold_started_at).total_seconds(),
                ),
            )
        except Exception:
            return max(0, total_seconds)
    return max(0, total_seconds)


def get_processing_hold_seconds(
    request: CertificateRequest,
    now: Optional[datetime] = None,
) -> int:
    total_seconds = int(getattr(request, "processing_hold_total_seconds", 0) or 0)
    if getattr(request, "processing_hold_active", False) and getattr(
        request, "processing_hold_started_at", None
    ):
        current_now = now or _resolve_now(request.processing_hold_started_at)
        try:
            total_seconds += max(
                0,
                int(
                    (current_now - request.processing_hold_started_at).total_seconds(),
                ),
            )
        except Exception:
            return max(0, total_seconds)
    return max(0, total_seconds)


def get_total_sla_hold_seconds(
    request: CertificateRequest,
    now: Optional[datetime] = None,
) -> int:
    return max(
        0,
        get_processing_hold_seconds(request, now=now)
        + get_request_hold_seconds(request, now=now),
    )


def get_effective_processing_seconds(
    request: CertificateRequest,
    end_time: Optional[datetime] = None,
) -> Optional[float]:
    if not request.created_at:
        return None
    resolved_end = end_time or request.updated_at or request.created_at
    try:
        total_seconds = (resolved_end - request.created_at).total_seconds()
    except Exception:
        return None
    effective = total_seconds - get_total_sla_hold_seconds(request, now=resolved_end)
    return max(0, effective)


def get_for_releasing_elapsed_seconds(
    request: CertificateRequest,
    now: Optional[datetime] = None,
) -> float:
    started_at = (
        getattr(request, "created_at", None)
        or getattr(request, "for_releasing_started_at", None)
        or getattr(request, "updated_at", None)
    )
    if not started_at:
        return 0
    current_now = now or _resolve_now(started_at)
    try:
        elapsed = (current_now - started_at).total_seconds()
    except Exception:
        return 0
    effective = elapsed - get_total_sla_hold_seconds(request, now=current_now)
    return max(0, effective)


def get_request_age_days(
    request: CertificateRequest,
    now: Optional[datetime] = None,
) -> int:
    if not request.created_at:
        return 0
    current_now = now or _resolve_now(request.created_at)
    effective_seconds = get_effective_processing_seconds(request, end_time=current_now)
    if effective_seconds is None:
        return 0
    return max(0, int(effective_seconds // (60 * 60 * 24)))


def start_request_hold(
    request: CertificateRequest,
    reason: str,
    source: str = SIGNATORY_UNAVAILABLE_HOLD_SOURCE,
    now: Optional[datetime] = None,
) -> bool:
    if request.release_hold_active:
        return False
    request.release_hold_active = True
    request.release_hold_started_at = now or _resolve_now(
        getattr(request, "for_releasing_started_at", None)
        or getattr(request, "updated_at", None)
        or getattr(request, "created_at", None),
    )
    request.release_hold_reason = reason
    request.release_hold_source = source
    return True


def start_processing_hold(
    request: CertificateRequest,
    reason: str = DEFAULT_PAYMENT_AWAITING_REASON,
    source: str = PAYMENT_AWAITING_HOLD_SOURCE,
    now: Optional[datetime] = None,
) -> bool:
    if getattr(request, "processing_hold_active", False):
        return False
    request.processing_hold_active = True
    request.processing_hold_started_at = now or _resolve_now(
        getattr(request, "pdf_generated_at", None)
        or getattr(request, "updated_at", None)
        or getattr(request, "created_at", None),
    )
    request.processing_hold_reason = reason
    request.processing_hold_source = source
    return True


def stop_request_hold(
    request: CertificateRequest,
    now: Optional[datetime] = None,
) -> bool:
    if not request.release_hold_active or not request.release_hold_started_at:
        request.release_hold_active = False
        request.release_hold_started_at = None
        return False

    current_now = now or _resolve_now(request.release_hold_started_at)
    try:
        elapsed_seconds = max(
            0,
            int((current_now - request.release_hold_started_at).total_seconds()),
        )
    except Exception:
        elapsed_seconds = 0

    request.release_hold_total_seconds = int(
        getattr(request, "release_hold_total_seconds", 0) or 0,
    ) + elapsed_seconds
    request.release_hold_active = False
    request.release_hold_started_at = None
    return True


def stop_processing_hold(
    request: CertificateRequest,
    now: Optional[datetime] = None,
) -> bool:
    if not request.processing_hold_active or not request.processing_hold_started_at:
        request.processing_hold_active = False
        request.processing_hold_started_at = None
        return False

    current_now = now or _resolve_now(request.processing_hold_started_at)
    try:
        elapsed_seconds = max(
            0,
            int((current_now - request.processing_hold_started_at).total_seconds()),
        )
    except Exception:
        elapsed_seconds = 0

    request.processing_hold_total_seconds = int(
        getattr(request, "processing_hold_total_seconds", 0) or 0,
    ) + elapsed_seconds
    request.processing_hold_active = False
    request.processing_hold_started_at = None
    return True


def _resolve_request_contacts(
    db: Session,
    request: CertificateRequest,
) -> tuple[Optional[str], Optional[str]]:
    student_repo = StudentRepository(db)
    program_repo = ProgramRepository(db)

    campus_email = None
    campus_tel_no = None
    student = None
    if request.sr_code:
        student = student_repo.get_by_sr_code(request.sr_code)
    campus = None
    if student is not None:
        campus = student.campus or (student.program.campus if student.program else None)
    if campus is None and request.program:
        program = program_repo.get_by_name(request.program)
        campus = program.campus if program else None
    if campus is not None:
        campus_email = campus.campus_email
        campus_tel_no = campus.campus_telNo
    return campus_email, campus_tel_no


async def send_manual_delay_notice(
    db: Session,
    request: CertificateRequest,
    reason: str,
    user_name: str = "Registrar",
) -> bool:
    if request.status != RequestStatus.FOR_RELEASING:
        return False

    campus_email, campus_tel_no = _resolve_request_contacts(db, request)
    email_service = EmailService()
    was_sent = await email_service.send_delay_notice(
        to_email=request.requestor_email,
        reference_number=request.reference_number,
        requestor_name=request.requestor_name,
        student_name=request.student_name,
        certificate_type=request.certificate_type_name,
        campus_email=campus_email,
        campus_telNo=campus_tel_no,
        reason=reason,
    )
    if not was_sent:
        return False

    hold_started = False
    if not request.release_hold_active:
        hold_started = start_request_hold(
            request,
            reason,
            source=MANUAL_DELAY_NOTICE_HOLD_SOURCE,
        )
        if hold_started:
            db.commit()
            db.refresh(request)

    log_action(
        db,
        action="REQUEST_DELAY_NOTICE_SENT",
        entity_type="certificate_request",
        entity_id=request.id,
        field_name="release_hold" if hold_started else "status",
        old_value=request.reference_number,
        new_value="FOR_RELEASING",
        user_name=user_name,
        notes=(
            f"Delay notice sent for {request.certificate_type_name or 'certificate request'} "
            f"({request.reference_number}). Reason: {reason}"
            + (
                " Release timer paused."
                if hold_started
                else ""
            )
        ),
    )
    return True


def hold_request_for_no_pickup(
    db: Session,
    request: CertificateRequest,
    user_name: str = "Registrar",
) -> bool:
    if request.status != RequestStatus.FOR_RELEASING:
        return False
    if request.release_hold_active:
        return False

    hold_started = start_request_hold(
        request,
        DEFAULT_REQUESTOR_NO_PICKUP_REASON,
        source=REQUESTOR_NO_PICKUP_HOLD_SOURCE,
    )
    if not hold_started:
        return False

    db.commit()
    db.refresh(request)

    log_action(
        db,
        action="REQUEST_RELEASE_HOLD_STARTED",
        entity_type="certificate_request",
        entity_id=request.id,
        field_name="release_hold",
        old_value=request.reference_number,
        new_value="FOR_RELEASING",
        user_name=user_name,
        notes=(
            f"Release timer paused for {request.reference_number} because the "
            "requestor did not pick up the certificate."
        ),
    )
    return True


async def send_signatory_unavailable_notice_and_hold(
    db: Session,
    request: CertificateRequest,
    user_name: str = "System",
) -> bool:
    if request.status != RequestStatus.FOR_RELEASING:
        return False
    if request.release_hold_active and (
        request.release_hold_source == SIGNATORY_UNAVAILABLE_HOLD_SOURCE
    ):
        return False

    campus_email, campus_tel_no = _resolve_request_contacts(db, request)
    email_service = EmailService()
    was_sent = await email_service.send_delay_notice(
        to_email=request.requestor_email,
        reference_number=request.reference_number,
        requestor_name=request.requestor_name,
        student_name=request.student_name,
        certificate_type=request.certificate_type_name,
        campus_email=campus_email,
        campus_telNo=campus_tel_no,
        reason=None,
    )
    if not was_sent:
        return False

    start_request_hold(
        request,
        DEFAULT_SIGNATORY_DELAY_REASON,
        source=SIGNATORY_UNAVAILABLE_HOLD_SOURCE,
    )
    db.commit()
    db.refresh(request)

    log_action(
        db,
        action="REQUEST_DELAY_NOTICE_SENT",
        entity_type="certificate_request",
        entity_id=request.id,
        field_name="release_hold",
        old_value=request.reference_number,
        new_value="FOR_RELEASING",
        user_name=user_name,
        notes=(
            f"Automatic delay notice sent because the authorized signatory is unavailable "
            f"for {request.reference_number}. Release timer paused."
        ),
    )
    return True
