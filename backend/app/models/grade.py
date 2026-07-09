from sqlalchemy import Column, DateTime, Float, ForeignKey, Integer, String
from sqlalchemy.sql import func

from app.database import Base


class Grade(Base):
    __tablename__ = "grades"

    id = Column(Integer, primary_key=True, index=True)
    student_id = Column(String(20), ForeignKey("students.sr_code"), nullable=False, index=True)
    enrollment_id = Column(Integer, ForeignKey("enrollments.id"), nullable=False, index=True)
    course_id = Column(Integer, ForeignKey("courses.id"), nullable=False, index=True)
    grade = Column(Float, nullable=False)
    remarks = Column(String(20), nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
