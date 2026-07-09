from fastapi import APIRouter, Depends
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.api.v1.auth import require_any_permissions, require_permissions
from app.database import get_db
from app.models.certificate_request import CertificateRequest, RequestStatus
from app.services.release_hold_service import (
    SIGNATORY_UNAVAILABLE_HOLD_SOURCE,
    get_signing_available,
    send_signatory_unavailable_notice_and_hold,
    set_signing_available,
    stop_request_hold,
)
from app.services.settings_service import get_bool_setting, set_bool_setting


router = APIRouter(prefix="/settings", tags=["Settings"])


class WetSignatureUpdate(BaseModel):
    use_wet_signature: bool


class SigningAvailabilityUpdate(BaseModel):
    signing_available: bool


@router.get("/wet-signature")
def get_wet_signature_setting(
    db: Session = Depends(get_db),
    _: dict = Depends(
        require_any_permissions("signatures.manage", "requests.update_status")
    ),
):
    return {"use_wet_signature": get_bool_setting(db, "use_wet_signature", False)}


@router.put("/wet-signature")
def update_wet_signature_setting(
    payload: WetSignatureUpdate,
    db: Session = Depends(get_db),
    _: dict = Depends(require_permissions("signatures.manage")),
):
    set_bool_setting(db, "use_wet_signature", payload.use_wet_signature)
    db.commit()
    return {"use_wet_signature": payload.use_wet_signature}


@router.get("/signing-availability")
def get_signing_availability_setting(
    db: Session = Depends(get_db),
    _: dict = Depends(require_permissions("requests.update_status")),
):
    return {"signing_available": get_signing_available(db)}


@router.put("/signing-availability")
async def update_signing_availability_setting(
    payload: SigningAvailabilityUpdate,
    db: Session = Depends(get_db),
    _: dict = Depends(require_permissions("requests.update_status")),
):
    set_signing_available(db, payload.signing_available)
    db.commit()

    if payload.signing_available:
        resumed_count = 0
        active_holds = (
            db.query(CertificateRequest)
            .filter(CertificateRequest.release_hold_active.is_(True))
            .filter(
                CertificateRequest.release_hold_source
                == SIGNATORY_UNAVAILABLE_HOLD_SOURCE
            )
            .all()
        )
        for request in active_holds:
            if stop_request_hold(request):
                resumed_count += 1
        db.commit()
        return {
            "signing_available": True,
            "auto_notice_count": 0,
            "resumed_hold_count": resumed_count,
        }

    auto_notice_count = 0
    releasing_requests = (
        db.query(CertificateRequest)
        .filter(CertificateRequest.status == RequestStatus.FOR_RELEASING)
        .all()
    )
    for request in releasing_requests:
        was_sent = await send_signatory_unavailable_notice_and_hold(db, request)
        if was_sent:
            auto_notice_count += 1

    return {
        "signing_available": False,
        "auto_notice_count": auto_notice_count,
        "resumed_hold_count": 0,
    }
