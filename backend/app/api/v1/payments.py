from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.payment import Payment
from app.models.certificate_request import (
    CertificateRequest,
    RequestStatus,
)
from app.schemas.payment import (
    PaymentCreate,
    PaymentResponse,
    PaymentLookupResponse,
    PaymentByReferenceCreate,
    PaymentReferencesRequest,
    PaymentInfo,
    PaymentInfoListResponse,
)
from app.services.request_service import trigger_for_releasing_flow
from app.repositories import CertificateRequestRepository, PaymentRepository
import anyio
from app.api.v1.auth import require_permissions
from app.services.audit_service import log_action
from app.services.release_hold_service import stop_processing_hold


router = APIRouter(prefix="/payments", tags=["Payments"])


def _payment_purpose_label(request: CertificateRequest) -> str:
    request_label = request.request_label
    prefix = (
        "Certificate Request"
        if request.request_type == "certificate"
        else "Document Request"
    )
    return f"{prefix} {request.reference_number} - {request_label}"


@router.post("/", response_model=PaymentResponse, status_code=status.HTTP_201_CREATED)
def create_payment(
    payload: PaymentCreate,
    db: Session = Depends(get_db),
    ctx: dict = Depends(require_permissions("payments.create")),
):
    request_repo = CertificateRequestRepository(db)
    payment_repo = PaymentRepository(db)
    request = request_repo.get_by_id(payload.request_id)
    if not request:
        raise HTTPException(status_code=404, detail="Request not found")

    amount = payload.amount
    if amount is None:
        amount = (
            float(request.request_cost) if request.request_cost is not None else None
        )
    if amount is None:
        raise HTTPException(
            status_code=400, detail="Payment amount is required for this request."
        )

    payment_status = payload.payment_status or "PAID"
    paid_at = datetime.now() if payment_status.upper() == "PAID" else None

    payment = Payment(
        sr_code=request.sr_code,
        payer_name=request.requestor_name,
        purpose=_payment_purpose_label(request),
        amount=amount,
        payment_method=payload.payment_method,
        payment_status=payment_status,
        paid_at=paid_at,
        or_number=payload.or_number,
        date_of_payment=paid_at,
    )

    # Invalidate existing PDF so it regenerates with DST info (OR number and date of payment)
    request.pdf_path = None

    payment_repo.add(payment)
    db.commit()
    db.refresh(payment)

    log_action(
        db,
        action="PAYMENT_RECORDED",
        entity_type="certificate_request",
        entity_id=request.id,
        field_name="payment_status",
        old_value="UNPAID",
        new_value=payment_status.upper(),
        user_name=ctx["user"].username if ctx.get("user") else "System",
        notes=(
            f"Recorded payment for {request.reference_number}"
            + (
                f" with OR number {payload.or_number.strip()}."
                if payload.or_number
                else "."
            )
        ),
    )

    if payment_status.upper() == "PAID":
        hold_stopped = stop_processing_hold(request, now=paid_at or datetime.now())
        if hold_stopped:
            log_action(
                db,
                action="DATA_UPDATED",
                entity_type="certificate_request",
                entity_id=request.id,
                field_name="processing_hold",
                old_value="paused",
                new_value="running",
                user_name=ctx["user"].username if ctx.get("user") else "System",
                notes=(
                    f"Processing timer resumed for {request.reference_number} "
                    "after payment was recorded."
                ),
            )

    if payment_status.upper() == "PAID" and request.status == RequestStatus.FOR_RELEASING:
        anyio.from_thread.run(
            trigger_for_releasing_flow,
            db,
            request,
        )
    return payment


@router.get("/unpaid-requests")
def list_unpaid_requests(
    skip: int = 0,
    limit: int = 200,
    db: Session = Depends(get_db),
    _: dict = Depends(require_permissions("payments.read")),
):
    request_repo = CertificateRequestRepository(db)
    payment_repo = PaymentRepository(db)

    requests = request_repo.query().order_by(CertificateRequest.created_at.desc()).all()
    paid_by_reference = payment_repo.get_by_references(
        [req.reference_number for req in requests if req.reference_number]
    )
    unpaid = [
        req
        for req in requests
        if req.reference_number and req.reference_number not in paid_by_reference
    ]

    return unpaid[skip : skip + limit]


@router.get("/lookup", response_model=PaymentLookupResponse)
def lookup_payment_request(reference_number: str, db: Session = Depends(get_db)):
    request_repo = CertificateRequestRepository(db)
    request = request_repo.get_by_reference(reference_number)
    if not request:
        raise HTTPException(status_code=404, detail="Request not found")

    return PaymentLookupResponse(
        id=request.id,
        sr_code=request.sr_code,
        reference_number=request.reference_number,
        student_name=request.student_name,
        certificate_type_name=request.request_label,
        requestor_name=request.requestor_name,
        request_cost=(
            float(request.request_cost) if request.request_cost is not None else None
        ),
        status=(
            request.status.value
            if hasattr(request.status, "value")
            else str(request.status)
        ),
    )


@router.post(
    "/by-reference", response_model=PaymentResponse, status_code=status.HTTP_201_CREATED
)
def create_payment_by_reference(
    payload: PaymentByReferenceCreate, db: Session = Depends(get_db)
):
    request_repo = CertificateRequestRepository(db)
    payment_repo = PaymentRepository(db)
    request = request_repo.get_by_reference(payload.reference_number)
    if not request:
        raise HTTPException(status_code=404, detail="Request not found")

    amount = payload.amount
    if amount is None:
        amount = (
            float(request.request_cost) if request.request_cost is not None else None
        )
    if amount is None:
        raise HTTPException(
            status_code=400, detail="Payment amount is required for this request."
        )

    payment_status = payload.payment_status or "PAID"
    paid_at = datetime.now() if payment_status.upper() == "PAID" else None

    if payload.purpose and payload.purpose != request.reference_number:
        raise HTTPException(
            status_code=400,
            detail="Purpose must match the reference number for this payment.",
        )

    payment_purpose = (
        payload.purpose if payload.purpose else _payment_purpose_label(request)
    )

    payment = Payment(
        sr_code=request.sr_code,
        payer_name=request.requestor_name,
        purpose=payment_purpose,
        amount=amount,
        payment_method=payload.payment_method,
        payment_status=payment_status,
        paid_at=paid_at,
        or_number=payload.or_number,
        date_of_payment=paid_at,
    )

    # Invalidate existing PDF so it regenerates with DST info (OR number and date of payment)
    request.pdf_path = None

    payment_repo.add(payment)
    db.commit()
    db.refresh(payment)

    log_action(
        db,
        action="PAYMENT_RECORDED",
        entity_type="certificate_request",
        entity_id=request.id,
        field_name="payment_status",
        old_value="UNPAID",
        new_value=payment_status.upper(),
        user_name="System",
        notes=(
            f"Recorded payment for {request.reference_number}"
            + (
                f" with OR number {payload.or_number.strip()}."
                if payload.or_number
                else "."
            )
        ),
    )

    if payment_status.upper() == "PAID":
        hold_stopped = stop_processing_hold(request, now=paid_at or datetime.now())
        if hold_stopped:
            log_action(
                db,
                action="DATA_UPDATED",
                entity_type="certificate_request",
                entity_id=request.id,
                field_name="processing_hold",
                old_value="paused",
                new_value="running",
                user_name="System",
                notes=(
                    f"Processing timer resumed for {request.reference_number} "
                    "after payment was recorded."
                ),
            )

    if payment_status.upper() == "PAID" and request.status == RequestStatus.FOR_RELEASING:
        anyio.from_thread.run(
            trigger_for_releasing_flow,
            db,
            request,
        )
    return payment


@router.post("/by-references", response_model=PaymentInfoListResponse)
def list_payments_by_references(
    payload: PaymentReferencesRequest,
    db: Session = Depends(get_db),
    _: dict = Depends(require_permissions("payments.read")),
):
    payment_repo = PaymentRepository(db)
    payments_by_reference = payment_repo.get_by_references(payload.reference_numbers or [])
    items = []
    for ref in payload.reference_numbers or []:
        normalized_ref = str(ref or "").strip()
        if not normalized_ref:
            continue
        payment = payments_by_reference.get(normalized_ref)
        if payment:
            items.append(
                PaymentInfo(
                    reference_number=normalized_ref,
                    amount=(
                        float(payment.amount) if payment.amount is not None else None
                    ),
                    or_number=payment.or_number,
                    payment_status=payment.payment_status,
                    paid_at=payment.paid_at,
                    date_of_payment=payment.date_of_payment,
                )
            )
    return PaymentInfoListResponse(items=items)
