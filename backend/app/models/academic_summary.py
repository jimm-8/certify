from sqlalchemy import Column, DateTime, Float, Integer, String, ForeignKey
from sqlalchemy.sql import func

from app.database import Base


class AcademicSummary(Base):
    __tablename__ = "academic_summary"

    id = Column(Integer, primary_key=True, index=True)
    sr_code = Column(String(20), ForeignKey("students.sr_code"), nullable=False, index=True)
    academic_year = Column(String(20), nullable=False, index=True)
    semester = Column(String(10), nullable=False, index=True)
    gwa = Column(Float, nullable=True)
    total_units_earned = Column(Integer, nullable=True)
    cumulative_units_earned = Column(Integer, nullable=True)
    status = Column(String(20), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
