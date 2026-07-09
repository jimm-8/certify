from sqlalchemy import Column, DateTime, Integer, String, Boolean, ForeignKey
from sqlalchemy.sql import func

from app.database import Base


class StudentIdRecord(Base):
    __tablename__ = "student_id_records"

    id = Column(Integer, primary_key=True, index=True)
    sr_code = Column(String(20), ForeignKey("students.sr_code"), nullable=False, index=True)
    student_name = Column(String(255), nullable=False)
    is_currently_enrolled = Column(Boolean, default=True, nullable=False)
    year_attended_start = Column(String(10), nullable=True)
    year_attended_end = Column(String(10), nullable=True)
    semester_current = Column(String(50), nullable=True)
    academic_year = Column(String(50), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
