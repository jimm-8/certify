from sqlalchemy import Column, Date, DateTime, ForeignKey, Integer, String
from sqlalchemy.sql import func

from app.database import Base


class Enrollment(Base):
    __tablename__ = "enrollments"

    id = Column(Integer, primary_key=True, index=True)
    student_id = Column(String(20), ForeignKey("students.sr_code"), nullable=False, index=True)
    academic_year = Column(String(20), nullable=False, index=True)
    semester = Column(String(10), nullable=False, index=True)
    year_level = Column(Integer, nullable=False)
    total_units = Column(Integer, nullable=False)
    date_enrolled = Column(Date, nullable=True)
    status = Column(String(20), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
