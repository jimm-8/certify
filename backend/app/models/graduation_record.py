from sqlalchemy import Column, DateTime, Integer, String, Boolean, ForeignKey
from sqlalchemy.sql import func

from app.database import Base


class GraduationRecordNew(Base):
    __tablename__ = "graduation_records"
    __table_args__ = {"extend_existing": True}

    id = Column(Integer, primary_key=True, index=True)
    sr_code = Column(String(20), ForeignKey("students.sr_code"), nullable=False, index=True)
    student_name = Column(String(255), nullable=False)
    is_graduated = Column(Boolean, default=False, nullable=False)
    status = Column(String(20), nullable=True)
    proposed_graduation_date = Column(String(50), nullable=True)
    program = Column(String(255), nullable=True)
    date_of_graduation = Column(String(50), nullable=True)
    board_resolution_number = Column(String(50), nullable=True)
    latin_honor = Column(String(50), nullable=True)
    semester = Column(String(50), nullable=True)
    academic_year = Column(String(50), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
