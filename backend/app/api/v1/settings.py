from fastapi import APIRouter, Depends
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.api.v1.auth import require_permissions
from app.database import get_db
from app.services.settings_service import get_bool_setting, set_bool_setting


router = APIRouter(prefix="/settings", tags=["Settings"])


class WetSignatureUpdate(BaseModel):
    use_wet_signature: bool


@router.get("/wet-signature")
def get_wet_signature_setting(
    db: Session = Depends(get_db),
    _: dict = Depends(require_permissions("signatures.manage")),
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
