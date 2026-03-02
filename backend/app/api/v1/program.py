from fastapi import APIRouter, Depends
from sqlalchemy import or_
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.program import Program
from app.models.campus import Campus

router = APIRouter(prefix="/programs", tags=["Programs"])


@router.get("/by-campus/{campus_name}")
def get_programs_by_campus(campus_name: str, db: Session = Depends(get_db)):
    normalized = campus_name.strip().lower().replace("-", " ")
    normalized = " ".join(normalized.split())

    campus_aliases = {
        "jplpc": ["JPLPC", "JPLPC - Malvar", "Malvar"],
        "malvar": ["JPLPC", "JPLPC - Malvar", "Malvar"],
        "jplpc malvar": ["JPLPC", "JPLPC - Malvar", "Malvar"],
        "arasof": ["ARASOF", "ARASOF - Nasugbu", "Nasugbu"],
        "nasugbu": ["ARASOF", "ARASOF - Nasugbu", "Nasugbu"],
        "arasof nasugbu": ["ARASOF", "ARASOF - Nasugbu", "Nasugbu"],
    }

    names_to_try = [campus_name.strip()]
    names_to_try.extend(campus_aliases.get(normalized, []))

    # 1) Exact-ish match against known variants
    exact_filters = [Campus.name.ilike(name) for name in names_to_try if name]
    campus = db.query(Campus).filter(or_(*exact_filters)).first() if exact_filters else None

    # 2) Fallback to contains match to tolerate DB naming differences
    if not campus:
        contains_filters = [
            Campus.name.ilike(f"%{name}%") for name in names_to_try if name
        ]
        campus = (
            db.query(Campus).filter(or_(*contains_filters)).first()
            if contains_filters
            else None
        )

    if not campus:
        return []

    programs = (
        db.query(Program)
        .filter(Program.campus_id == campus.id)
        .order_by(Program.name)
        .all()
    )

    return [
        {
            "id": p.id,
            "name": p.name,
            "major": p.major
        }
        for p in programs
    ]
