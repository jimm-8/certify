from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import Optional

from app.database import get_db
from app.models.student import Student
from app.models.program import Program
from app.schemas.student import StudentResponse

# Create router
router = APIRouter(prefix="/mock-student-db", tags=["Mock Student Database"])

@router.get("/student/{sr_code}", response_model=StudentResponse)
def get_student_by_sr_code(
    sr_code: str,
    db: Session = Depends(get_db)
):
    """
    Mock Student Database API
    
    Simulates fetching student data from the school's database.
    In production, this would call the real student database API.
    """
    
    student = db.query(Student).filter(Student.sr_code == sr_code).first()
    
    if not student:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Student with SR Code {sr_code} not found in database"
        )
    
    return student

@router.get("/students/search")
def search_students(
    name: Optional[str] = None,
    program: Optional[str] = None,
    skip: int = 0,
    limit: int = 10,
    db: Session = Depends(get_db)
):
    """
    Search students by name or program
    """
    
    query = db.query(Student)
    
    if name:
        search_term = f"%{name}%"
        query = query.filter(
            (Student.first_name.ilike(search_term)) |
            (Student.last_name.ilike(search_term))
        )
    
    if program:
        query = query.join(Program, Student.program_id == Program.id).filter(
            Program.name.ilike(f"%{program}%")
        )
    
    students = query.offset(skip).limit(limit).all()
    
    return students
