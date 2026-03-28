from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.payment import Payment
from app.models.certificate_request import CertificateRequest, RequestStatus
from app.schemas.payment import (
    PaymentCreate,
    PaymentResponse,
    PaymentLookupResponse,
    PaymentByReferenceCreate,
)
from app.services.request_service import generate_or_number, update_request_status
import anyio


router = APIRouter(prefix="/payments", tags=["Payments"])


@router.post("/", response_model=PaymentResponse, status_code=status.HTTP_201_CREATED)
def create_payment(payload: PaymentCreate, db: Session = Depends(get_db)):
    request = (
        db.query(CertificateRequest)
        .filter(CertificateRequest.id == payload.request_id)
        .first()
    )
    if not request:
        raise HTTPException(status_code=404, detail="Request not found")

    amount = payload.amount
    if amount is None:
        amount = float(request.request_cost) if request.request_cost is not None else None
    if amount is None:
        raise HTTPException(
            status_code=400, detail="Payment amount is required for this request."
        )

    payment_status = payload.payment_status or "PAID"
    paid_at = datetime.now() if payment_status.upper() == "PAID" else None

    payment = Payment(
        sr_code=request.sr_code,
        payer_name=request.requestor_name,
        purpose=f"Certificate Request {request.reference_number} - {request.certificate_type_name}",
        amount=amount,
        payment_method=payload.payment_method,
        payment_status=payment_status,
        paid_at=paid_at,
    )

    if payload.or_number:
        request.or_number = payload.or_number
    elif not request.or_number:
        request.or_number = generate_or_number(db)

    db.add(payment)
    db.commit()
    db.refresh(payment)

    # Auto-advance to FOR_RELEASING once payment is detected
    if payment_status.upper() == "PAID" and request.status == RequestStatus.PROCESSING:
        anyio.from_thread.run(
            update_request_status,
            db,
            request.id,
            RequestStatus.FOR_RELEASING,
            "System",
            "Auto-marked for releasing after payment",
        )
    return payment


@router.get("/lookup", response_model=PaymentLookupResponse)
def lookup_payment_request(reference_number: str, db: Session = Depends(get_db)):
    request = (
        db.query(CertificateRequest)
        .filter(CertificateRequest.reference_number == reference_number)
        .first()
    )
    if not request:
        raise HTTPException(status_code=404, detail="Request not found")

    return PaymentLookupResponse(
        id=request.id,
        sr_code=request.sr_code,
        reference_number=request.reference_number,
        student_name=request.student_name,
        certificate_type_name=request.certificate_type_name,
        requestor_name=request.requestor_name,
        request_cost=float(request.request_cost) if request.request_cost is not None else None,
        status=request.status.value if hasattr(request.status, "value") else str(request.status),
    )


@router.post("/by-reference", response_model=PaymentResponse, status_code=status.HTTP_201_CREATED)
def create_payment_by_reference(payload: PaymentByReferenceCreate, db: Session = Depends(get_db)):
    request = (
        db.query(CertificateRequest)
        .filter(CertificateRequest.reference_number == payload.reference_number)
        .first()
    )
    if not request:
        raise HTTPException(status_code=404, detail="Request not found")

    amount = payload.amount
    if amount is None:
        amount = float(request.request_cost) if request.request_cost is not None else None
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
        payload.purpose
        if payload.purpose
        else f"Certificate Request {request.reference_number} - {request.certificate_type_name}"
    )

    payment = Payment(
        sr_code=request.sr_code,
        payer_name=request.requestor_name,
        purpose=payment_purpose,
        amount=amount,
        payment_method=payload.payment_method,
        payment_status=payment_status,
        paid_at=paid_at,
    )

    if payload.or_number:
        request.or_number = payload.or_number
    elif not request.or_number:
        request.or_number = generate_or_number(db)

    db.add(payment)
    db.commit()
    db.refresh(payment)

    # Auto-advance to FOR_RELEASING once payment is detected
    if payment_status.upper() == "PAID" and request.status == RequestStatus.PROCESSING:
        anyio.from_thread.run(
            update_request_status,
            db,
            request.id,
            RequestStatus.FOR_RELEASING,
            "System",
            "Auto-marked for releasing after payment",
        )
    return payment
