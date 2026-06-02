from sqlalchemy.orm import Session
from sqlalchemy import and_, case, func, or_
from fastapi import HTTPException, status
from typing import Optional
import secrets
import os
from datetime import datetime
from app.services.email_service import EmailService
from app.services.release_hold_service import (
    get_signing_available,
    send_signatory_unavailable_notice_and_hold,
    stop_processing_hold,
)
from app.services.settings_service import get_bool_setting
from app.services.fee_service import (
    compute_request_cost,
    is_certification_of_grades,
    is_course_description,
)
from pypdf import PdfReader

from app.models.certificate_request import (
    AutoPrintStatus,
    CertificateRequest,
    RequestStatus,
    RequestType,
)
from app.models.certificate import Certificate
from app.models.audit_log import AuditLog
from app.models.user import User
from app.repositories import (
    AuditLogRepository,
    CertificateRepository,
    CertificateRequestRepository,
    PaymentRepository,
    ProgramRepository,
    StudentRepository,
)
from app.services.request_review_service import request_requires_manual_review

STATUS_AUDIT_ACTIONS = {
    RequestStatus.APPROVED: "REQUEST_APPROVED",
    RequestStatus.PROCESSING: "REQUEST_PROCESSED",
    RequestStatus.FOR_RELEASING: "REQUEST_READY_FOR_RELEASE",
    RequestStatus.RELEASED: "REQUEST_RELEASED",
    RequestStatus.REJECTED: "REQUEST_REJECTED",
    RequestStatus.PENDING: "REQUEST_MARKED_PENDING",
}

# Define valid status transitions
VALID_TRANSITIONS = {
    RequestStatus.SUBMITTED: [
        RequestStatus.APPROVED,
        RequestStatus.PENDING,
        RequestStatus.REJECTED,
    ],
    RequestStatus.PENDING: [RequestStatus.APPROVED, RequestStatus.REJECTED],
    RequestStatus.APPROVED: [RequestStatus.PROCESSING, RequestStatus.REJECTED],
    RequestStatus.PROCESSING: [RequestStatus.FOR_RELEASING, RequestStatus.REJECTED],
    RequestStatus.FOR_RELEASING: [RequestStatus.RELEASED],
    RequestStatus.RELEASED: [],  # Final state
}

CERTIFY_ONLY_STATUSES = {
    RequestStatus.APPROVED,
    RequestStatus.PROCESSING,
    RequestStatus.FOR_RELEASING,
    RequestStatus.RELEASED,
}

PROCESSING_QUEUE_DEFAULT_LIMIT = 5
PROCESSING_ELIGIBLE_ROLES = {"registrar_staff", "registrar_head", "superadmin"}


def can_transition_to(current_status: RequestStatus, new_status: RequestStatus) -> bool:
    """Check if status transition is valid"""
    return new_status in VALID_TRANSITIONS.get(current_status, [])


def generate_verification_token() -> str:
    """Generate unique verification token for QR code"""
    return secrets.token_urlsafe(32)


def generate_or_number(db: Session, now: Optional[datetime] = None) -> str:
    """Generate OR number in format: YY-MM-#### (monthly sequence)."""
    now = now or datetime.now()
    year = now.strftime("%y")
    month = now.strftime("%m")
    prefix = f"{year}-{month}-"

    request_repo = CertificateRequestRepository(db)
    count = (
        request_repo.query()
        .filter(CertificateRequest.control_num.like(f"{prefix}%"))
        .count()
    )

    next_num = count + 1
    return f"{prefix}{next_num:04d}"


def clear_auto_print_tracking(request: CertificateRequest) -> None:
    """Remove any active auto-print queue metadata from a request."""
    request.auto_print_requested_at = None
    request.auto_print_status = None
    request.auto_print_job_id = None
    request.auto_print_error = None
    request.auto_print_confirmed_at = None


def _is_paid_payment(payment) -> bool:
    return bool(payment and str(getattr(payment, "payment_status", "") or "").upper() == "PAID")


async def auto_generate_processing_request(
    db: Session,
    request: CertificateRequest,
    user_name: str = "System",
    trigger_auto_queue: bool = True,
) -> CertificateRequest:
    if request.status != RequestStatus.PROCESSING:
        return request

    if request_requires_manual_review(db, request):
        return request

    request_repo = CertificateRequestRepository(db)
    audit_repo = AuditLogRepository(db)
    student_repo = StudentRepository(db)
    program_repo = ProgramRepository(db)

    if not request.control_num:
        request.control_num = generate_or_number(db)

    try:
        from app.services.certificate_service import generate_certificate_pdf

        pdf_path = generate_certificate_pdf(db, request.id, user_name)
        request.pdf_path = pdf_path

        try:
            reader = PdfReader(pdf_path)
            page_count = len(reader.pages)
        except Exception:
            page_count = None

        if page_count:
            old_cost = request.request_cost
            request.request_cost = compute_request_cost(
                request.certificate_type_name, pages=page_count
            )
            if old_cost != request.request_cost:
                audit_repo.add(
                    AuditLog(
                        action="DATA_UPDATED",
                        entity_type="certificate_request",
                        entity_id=request.id,
                        field_name="request_cost",
                        old_value=str(old_cost) if old_cost is not None else None,
                        new_value=str(request.request_cost),
                        user_name=user_name,
                        notes=f"Updated request cost based on {page_count} PDF page(s).",
                    )
                )

        if page_count is None and not (
            is_course_description(request.certificate_type_name)
            or is_certification_of_grades(request.certificate_type_name)
        ):
            request.request_cost = compute_request_cost(request.certificate_type_name)

        audit_repo.add(
            AuditLog(
                action="NOTE_ADDED",
                entity_type="certificate_request",
                entity_id=request.id,
                field_name="notes",
                new_value=f"Certificate automatically generated: {os.path.basename(pdf_path)}",
                user_name=user_name,
            )
        )

        old_status = request.status
        request.status = RequestStatus.FOR_RELEASING
        audit_repo.add(
            AuditLog(
                action=STATUS_AUDIT_ACTIONS.get(
                    RequestStatus.FOR_RELEASING, "STATUS_CHANGED"
                ),
                entity_type="certificate_request",
                entity_id=request.id,
                field_name="status",
                old_value=old_status.value,
                new_value=RequestStatus.FOR_RELEASING.value,
                user_name=user_name,
                notes="Certificate PDF completed. Awaiting payment before release.",
            )
        )

        db.commit()
        db.refresh(request)

        await trigger_for_releasing_flow(
            db,
            request,
            student_repo=student_repo,
            program_repo=program_repo,
        )

        if trigger_auto_queue:
            try:
                await auto_queue_approved_requests(db, user_name="System")
            except Exception as exc:
                print(f"[AutoQueue] Failed to refill freed slot: {exc}")
    except Exception as exc:
        db.commit()
        db.refresh(request)
        print(f"Auto-generation failed: {exc}")

    return request


async def trigger_for_releasing_flow(
    db: Session,
    request: CertificateRequest,
    student_repo: StudentRepository | None = None,
    program_repo: ProgramRepository | None = None,
) -> None:
    payment_repo = PaymentRepository(db)
    payment = payment_repo.get_by_reference(request.reference_number or "")
    payment_is_recorded = _is_paid_payment(payment)

    if not request.for_releasing_started_at:
        request.for_releasing_started_at = datetime.now()

    signing_available = get_signing_available(db)
    skip_ready_email = False

    if not signing_available:
        db.commit()
        db.refresh(request)
        if not request.release_hold_active:
            was_sent = await send_signatory_unavailable_notice_and_hold(db, request)
            if was_sent:
                print(
                    f"Auto signatory delay notice sent to {request.requestor_email}"
                )
        return

    if not skip_ready_email and not request.ready_email_sent_at:
        student_repo = student_repo or StudentRepository(db)
        program_repo = program_repo or ProgramRepository(db)
        campus_telNo = None
        campus_email = None
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
            campus_telNo = campus.campus_telNo
            campus_email = campus.campus_email

        email_service = EmailService()
        await email_service.send_ready_for_release(
            to_email=request.requestor_email,
            reference_number=request.reference_number,
            requestor_name=request.requestor_name,
            student_name=request.student_name,
            certificate_type=request.certificate_type_name,
            submitted_date=request.created_at or datetime.now(),
            payment_amount=request.request_cost,
            pin=request.pin,
            tracking_url=os.getenv("TRACK_URL", "http://localhost:5173/track"),
            campus_email=campus_email,
            campus_telNo=campus_telNo,
        )
        request.ready_email_sent_at = datetime.now()
        print(f"Release email sent to {request.requestor_email}")

    if payment_is_recorded:
        stop_processing_hold(request)
        if not request.auto_print_requested_at:
            request.auto_print_requested_at = datetime.now()
        if request.auto_print_status not in {
            AutoPrintStatus.SUBMITTED.value,
            AutoPrintStatus.SENDING.value,
            AutoPrintStatus.COMPLETED.value,
        }:
            request.auto_print_status = AutoPrintStatus.REQUESTED.value
            request.auto_print_job_id = None
            request.auto_print_error = None
            request.auto_print_confirmed_at = None

    db.commit()
    db.refresh(request)


def get_processing_queue_counts(db: Session) -> dict[str, int]:
    rows = (
        db.query(
            CertificateRequest.owner_username,
            func.count(CertificateRequest.id),
        )
        .filter(
            CertificateRequest.status == RequestStatus.PROCESSING,
            CertificateRequest.owner_username.is_not(None),
        )
        .group_by(CertificateRequest.owner_username)
        .all()
    )
    return {str(username): int(count) for username, count in rows if username}


def get_request_queue_context(
    db: Session,
    request: CertificateRequest,
) -> tuple[Optional[int], Optional[int], Optional[str]]:
    created_at = request.created_at
    if created_at is None:
        return None, None, None

    if request.request_type != RequestType.CERTIFICATE.value or request.status not in {
        RequestStatus.APPROVED,
        RequestStatus.PROCESSING,
    }:
        return None, None, None

    processing_query = db.query(CertificateRequest).filter(
        CertificateRequest.request_type == RequestType.CERTIFICATE.value,
        CertificateRequest.status == RequestStatus.PROCESSING,
    )
    waiting_query = db.query(CertificateRequest).filter(
        CertificateRequest.request_type == RequestType.CERTIFICATE.value,
        CertificateRequest.status == RequestStatus.APPROVED,
        CertificateRequest.owner_username.is_(None),
    )

    processing_total = processing_query.count()
    waiting_total = waiting_query.count()
    queue_total = processing_total + waiting_total

    if request.status == RequestStatus.PROCESSING:
        queue_position = processing_query.filter(
            or_(
                CertificateRequest.created_at < created_at,
                and_(
                    CertificateRequest.created_at == created_at,
                    CertificateRequest.id <= request.id,
                ),
            )
        ).count()
    else:
        waiting_position = waiting_query.filter(
            or_(
                CertificateRequest.created_at < created_at,
                and_(
                    CertificateRequest.created_at == created_at,
                    CertificateRequest.id <= request.id,
                ),
            )
        ).count()
        queue_position = processing_total + waiting_position

    return queue_position or None, queue_total or None, "overall"


def get_available_processing_assignee(db: Session) -> tuple[User | None, dict[str, int]]:
    queue_counts = get_processing_queue_counts(db)
    eligible_users = (
        db.query(User)
        .filter(
            User.is_active == True,
            User.can_process_certificates == True,
            User.role.in_(PROCESSING_ELIGIBLE_ROLES),
        )
        .order_by(User.username.asc())
        .all()
    )

    ranked: list[tuple[int, str, User]] = []
    for user in eligible_users:
        current_count = queue_counts.get(user.username, 0)
        queue_limit = max(int(user.processing_queue_limit or 0), 0)
        if queue_limit <= 0:
            continue
        if current_count >= queue_limit:
            continue
        ranked.append((current_count, user.username or "", user))

    if not ranked:
        return None, queue_counts

    ranked.sort(key=lambda item: (item[0], item[1]))
    return ranked[0][2], queue_counts


async def auto_queue_approved_requests(
    db: Session,
    user_name: str = "System",
) -> dict[str, int]:
    request_repo = CertificateRequestRepository(db)
    approved_requests = (
        request_repo.query()
        .filter(
            CertificateRequest.request_type == RequestType.CERTIFICATE.value,
            CertificateRequest.status == RequestStatus.APPROVED,
        )
        .order_by(CertificateRequest.created_at.asc(), CertificateRequest.id.asc())
        .all()
    )

    queued_count = 0
    review_count = 0
    blocked_count = 0

    for request in approved_requests:
        if request.owner_username:
            continue

        needs_manual_review = request_requires_manual_review(db, request)

        assignee, queue_counts = get_available_processing_assignee(db)
        if assignee is None:
            blocked_count += 1
            break

        await update_request_status(
            db=db,
            request_id=request.id,
            new_status=RequestStatus.PROCESSING,
            user_name=assignee.username,
            notes=(
                f"Automatically assigned to {assignee.username} queue."
                if not needs_manual_review
                else (
                    f"Automatically assigned to {assignee.username} queue "
                    "for manual review."
                )
            ),
        )
        queue_counts[assignee.username] = queue_counts.get(assignee.username, 0) + 1
        queued_count += 1
        if needs_manual_review:
            review_count += 1

    return {
        "queued": queued_count,
        "needs_review": review_count,
        "blocked": blocked_count,
    }


async def update_request_status(
    db: Session,
    request_id: int,
    new_status: RequestStatus,
    user_name: str = "System",
    notes: Optional[str] = None,
    trigger_auto_queue: bool = True,
) -> CertificateRequest:
    """
    Update request status with validation and audit logging
    """
    # Get request
    request_repo = CertificateRequestRepository(db)
    payment_repo = PaymentRepository(db)
    student_repo = StudentRepository(db)
    program_repo = ProgramRepository(db)
    certificate_repo = CertificateRepository(db)
    audit_repo = AuditLogRepository(db)
    request = request_repo.get_by_id(request_id)
    if not request:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Request not found"
        )

    # Check if already in final state
    if request.status in [RequestStatus.RELEASED]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Cannot change status of {request.status.value} request",
        )

    # Validate transition
    if not can_transition_to(request.status, new_status):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Cannot transition from {request.status.value} to {new_status.value}",
        )

    if (
        request.request_type != RequestType.CERTIFICATE.value
        and new_status in CERTIFY_ONLY_STATUSES
    ):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Only certificate requests can enter the Certify workflow.",
        )

    # Store old status for audit
    old_status = request.status
    audit_user_name = user_name or request.owner_username or "System"
    auto_moved_to_for_releasing = False

    if new_status == RequestStatus.PROCESSING:
        claimed_owner = user_name if user_name and user_name != "System" else None
        update_values = {
            CertificateRequest.status: new_status,
            CertificateRequest.updated_at: datetime.now(),
        }
        if claimed_owner:
            update_values[CertificateRequest.owner_username] = case(
                (
                    CertificateRequest.owner_username.is_(None),
                    claimed_owner,
                ),
                else_=CertificateRequest.owner_username,
            )

        claimed = (
            request_repo.query()
            .filter(
                CertificateRequest.id == request_id,
                CertificateRequest.status == RequestStatus.APPROVED,
            )
            .update(update_values, synchronize_session=False)
        )

        if claimed == 0:
            db.rollback()
            current = request_repo.get_by_id(request_id)
            if not current:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="Request not found",
                )
            if current.status == RequestStatus.PROCESSING:
                owner_label = current.owner_username or "another user"
                raise HTTPException(
                    status_code=status.HTTP_409_CONFLICT,
                    detail=f"Request was already processed by {owner_label}.",
                )
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=(
                    f"Request is already {current.status.value} and can no longer "
                    f"be moved to {new_status.value}."
                ),
            )

        db.refresh(request)
    else:
        # Update status
        request.status = new_status

    # Generate verification token when moving to APPROVED
    if new_status == RequestStatus.APPROVED and not request.verification_token:
        request.verification_token = generate_verification_token()

    # Create audit log
    audit_log = AuditLog(
        action=STATUS_AUDIT_ACTIONS.get(new_status, "STATUS_CHANGED"),
        entity_type="certificate_request",
        entity_id=request_id,
        field_name="status",
        old_value=old_status.value,
        new_value=new_status.value,
        user_name=audit_user_name,
        notes=notes,
    )
    audit_repo.add(audit_log)

    if new_status == RequestStatus.PROCESSING:
        auto_generated_request = await auto_generate_processing_request(
            db=db,
            request=request,
            user_name=audit_user_name,
            trigger_auto_queue=trigger_auto_queue,
        )
        if auto_generated_request.status == RequestStatus.FOR_RELEASING:
            auto_moved_to_for_releasing = True

    final_status = request.status

    if final_status == RequestStatus.RELEASED:
        clear_auto_print_tracking(request)

        # Persist released requests into certificates table (idempotent)
        existing_cert = certificate_repo.get_by_request_id(request.id)
        if not existing_cert:
            certificate_repo.add(
                Certificate(
                    certificate_request_id=request.id,
                    certificate_type_id=request.certificate_type_id,
                    issued_to=request.student_name,
                    sr_code=request.sr_code,
                    issued_by=user_name,
                    issued_at=datetime.now(),
                    or_number=request.control_num,
                    file_path=request.pdf_path,
                )
            )

    db.commit()
    db.refresh(request)

    if final_status == RequestStatus.FOR_RELEASING:
        try:
            await trigger_for_releasing_flow(
                db,
                request,
                student_repo=student_repo,
                program_repo=program_repo,
            )
        except Exception as e:
            print(f"Release email failed: {e}")

    if (
        trigger_auto_queue
        and (
            (old_status == RequestStatus.PROCESSING and final_status != RequestStatus.PROCESSING)
            or auto_moved_to_for_releasing
        )
    ):
        try:
            await auto_queue_approved_requests(db, user_name="System")
        except Exception as exc:
            print(f"[AutoQueue] Failed to refill freed slot: {exc}")

    return request


def update_student_data(
    db: Session,
    request_id: int,
    updates: dict,
    user_name: str = "System",
    notes: Optional[str] = None,
) -> CertificateRequest:
    """
    Update student information on a request
    """
    request_repo = CertificateRequestRepository(db)
    audit_repo = AuditLogRepository(db)
    request = request_repo.get_by_id(request_id)
    if not request:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Request not found"
        )

    # Update fields and create audit logs
    for field, new_value in updates.items():
        if new_value is not None and hasattr(request, field):
            old_value = getattr(request, field)
            if old_value != new_value:
                setattr(request, field, new_value)

                # Create audit log
                audit_log = AuditLog(
                    action="DATA_UPDATED",
                    entity_type="certificate_request",
                    entity_id=request_id,
                    field_name=field,
                    old_value=str(old_value) if old_value else None,
                    new_value=str(new_value),
                    user_name=user_name,
                    notes=notes,
                )
                audit_repo.add(audit_log)

    db.commit()
    db.refresh(request)

    return request


def add_note_to_request(
    db: Session,
    request_id: int,
    note_text: str,
    note_type: str = "INFO",
    user_name: str = "System",
) -> AuditLog:
    """
    Add a note to a request
    """
    request_repo = CertificateRequestRepository(db)
    audit_repo = AuditLogRepository(db)
    request = request_repo.get_by_id(request_id)
    if not request:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Request not found"
        )

    audit_log = AuditLog(
        action="NOTE_ADDED",
        entity_type="certificate_request",
        entity_id=request_id,
        field_name="notes",
        new_value=note_text,
        user_name=user_name,
    )
    audit_repo.add(audit_log)

    db.commit()
    db.refresh(audit_log)

    return audit_log
