from sqlalchemy.orm import Session
from fastapi import HTTPException, status
from typing import Optional
import secrets
import os
from datetime import datetime
from app.services.email_service import EmailService
from app.services.release_hold_service import (
    get_signing_available,
    send_signatory_unavailable_notice_and_hold,
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
from app.models.payment import Payment
from app.models.student import Student
from app.models.program import Program
from app.repositories import (
    AuditLogRepository,
    CertificateRepository,
    CertificateRequestRepository,
    PaymentRepository,
    ProgramRepository,
    StudentRepository,
)

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


async def update_request_status(
    db: Session,
    request_id: int,
    new_status: RequestStatus,
    user_name: str = "System",
    notes: Optional[str] = None,
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

    # Require payment before releasing
    if new_status == RequestStatus.FOR_RELEASING:
        ref = request.reference_number or ""
        payment = payment_repo.get_by_reference(ref)
        if not payment:
            try:
                campus_telNo = None
                campus_email = None
                student = None
                if request.sr_code:
                    student = student_repo.get_by_sr_code(request.sr_code)
                campus = None
                if student is not None:
                    campus = student.campus or (
                        student.program.campus if student.program else None
                    )
                if campus is None and request.program:
                    program = program_repo.get_by_name(request.program)
                    campus = program.campus if program else None
                if campus is not None:
                    campus_telNo = campus.campus_telNo
                    campus_email = campus.campus_email

                email_service = EmailService()
                await email_service.send_payment_missing_notice(
                    to_email=request.requestor_email,
                    reference_number=request.reference_number,
                    requestor_name=request.requestor_name,
                    student_name=request.student_name,
                    certificate_type=request.certificate_type_name,
                    request_cost=request.request_cost,
                    campus_email=campus_email,
                    campus_telNo=campus_telNo,
                )
            except Exception as e:
                print(f"⚠️ Payment-missing email failed: {e}")
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Cannot change status. No payment found for this reference number.",
            )

    # Store old status for audit
    old_status = request.status

    # Update status
    request.status = new_status

    # Generate verification token when moving to APPROVED
    if new_status == RequestStatus.APPROVED and not request.verification_token:
        request.verification_token = generate_verification_token()

    # Create audit log
    audit_log = AuditLog(
        action="STATUS_CHANGED",
        entity_type="certificate_request",
        entity_id=request_id,
        field_name="status",
        old_value=old_status.value,
        new_value=new_status.value,
        user_name=user_name,
        notes=notes,
    )
    audit_repo.add(audit_log)

    if new_status == RequestStatus.PROCESSING:
        if not request.control_num:
            request.control_num = generate_or_number(db)
        try:
            from app.services.certificate_service import generate_certificate_pdf

            pdf_path = generate_certificate_pdf(db, request_id, user_name)

            # Save PDF path to request
            request.pdf_path = pdf_path

            # Compute cost based on actual PDF pages
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
                            entity_id=request_id,
                            field_name="request_cost",
                            old_value=str(old_cost) if old_cost is not None else None,
                            new_value=str(request.request_cost),
                            user_name="System",
                            notes=f"Updated request cost based on {page_count} PDF page(s).",
                        )
                    )

            if page_count is None and not (
                is_course_description(request.certificate_type_name)
                or is_certification_of_grades(request.certificate_type_name)
            ):
                request.request_cost = compute_request_cost(
                    request.certificate_type_name
                )

            # Add note about auto-generation
            audit_repo.add(
                AuditLog(
                    action="NOTE_ADDED",
                    entity_type="certificate_request",
                    entity_id=request_id,
                    field_name="notes",
                    new_value=f"Certificate automatically generated: {os.path.basename(pdf_path)}",
                    user_name="System",
                )
            )
        except Exception as e:
            db.commit()
            db.refresh(request)
            print(f"Auto-generation failed: {e}")
            # Don't fail the status update if PDF generation fails

    if new_status == RequestStatus.RELEASED:
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

    if new_status == RequestStatus.PROCESSING and request.request_cost is not None:
        try:
            campus_email = None
            campus_telNo = None
            student = None
            if request.sr_code:
                student = student_repo.get_by_sr_code(request.sr_code)
            campus = None
            if student is not None:
                campus = student.campus or (
                    student.program.campus if student.program else None
                )
            if campus is None and request.program:
                program = program_repo.get_by_name(request.program)
                campus = program.campus if program else None
            if campus is not None:
                campus_email = campus.campus_email
                campus_telNo = campus.campus_telNo

            email_service = EmailService()
            await email_service.send_request_confirmation(
                to_email=request.requestor_email,
                reference_number=request.reference_number,
                pin=request.pin,
                requestor_name=request.requestor_name,
                student_name=request.student_name,
                certificate_type=request.certificate_type_name,
                submitted_date=request.created_at,
                request_cost=request.request_cost,
                campus_email=campus_email,
                campus_telNo=campus_telNo,
            )
            print(f"✅ Confirmation email sent to {request.requestor_email}")
        except Exception as e:
            print(f"⚠️ Confirmation email failed: {e}")

    if new_status == RequestStatus.FOR_RELEASING:
        try:
            request.for_releasing_started_at = datetime.now()
            request.auto_print_requested_at = datetime.now()
            request.auto_print_status = AutoPrintStatus.REQUESTED.value
            request.auto_print_job_id = None
            request.auto_print_error = None
            request.auto_print_confirmed_at = None
            signing_available = get_signing_available(db)
            # When wet signature is enabled, ready email is sent manually
            skip_ready_email = get_bool_setting(db, "use_wet_signature", False)
            if not signing_available:
                db.commit()
                db.refresh(request)
                was_sent = await send_signatory_unavailable_notice_and_hold(
                    db,
                    request,
                )
                if was_sent:
                    print(
                        f"Auto signatory delay notice sent to {request.requestor_email}"
                    )
            elif skip_ready_email:
                db.commit()
                db.refresh(request)
            elif not skip_ready_email:
                campus_telNo = None
                student = None
                if request.sr_code:
                    student = student_repo.get_by_sr_code(request.sr_code)
                campus = None
                if student is not None:
                    campus = student.campus or (
                        student.program.campus if student.program else None
                    )
                if campus is None and request.program:
                    program = program_repo.get_by_name(request.program)
                    campus = program.campus if program else None
                if campus is not None:
                    campus_telNo = campus.campus_telNo

                email_service = EmailService()
                await email_service.send_ready_for_release(
                    to_email=request.requestor_email,
                    reference_number=request.reference_number,
                    requestor_name=request.requestor_name,
                    student_name=request.student_name,
                    certificate_type=request.certificate_type_name,
                    campus_telNo=campus_telNo,
                )
                request.ready_email_sent_at = datetime.now()
                db.commit()
                db.refresh(request)
                print(f"✅ Release email sent to {request.requestor_email}")
        except Exception as e:
            print(f"⚠️ Release email failed: {e}")

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
