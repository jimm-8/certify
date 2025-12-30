from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from typing import List

from app.database import get_db
from app.models.student import Program
from app.schemas.student import ProgramResponse

# Create router
router = APIRouter(prefix="/programs", tags=["Programs"])

# Get all programs
@router.get("/", response_model=List[ProgramResponse])
def get_programs(
    db: Session = Depends(get_db)
):
    """
    Get all available programs/courses
    
    Returns a list of all programs for the datalist in the form.
    """
    
    programs = db.query(Program).filter(
        Program.is_active == 1
    ).order_by(Program.name).all()
    
    return programs