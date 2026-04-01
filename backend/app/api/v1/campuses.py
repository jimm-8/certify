from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.database import get_db
from app.repositories import CampusRepository
from app.api.v1.auth import require_permissions

router = APIRouter(prefix="/campuses", tags=["Campuses"])


@router.get("/")
def list_campuses(
    db: Session = Depends(get_db),
    _: dict = Depends(require_permissions("signatures.manage")),
):
    campus_repo = CampusRepository(db)
    campuses = campus_repo.query().order_by(campus_repo.model.name).all()
    return [
        {
            "id": c.id,
            "name": c.name,
        }
        for c in campuses
    ]
