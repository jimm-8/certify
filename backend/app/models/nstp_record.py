from sqlalchemy import Column, Date, DateTime, ForeignKey, Integer, String
from sqlalchemy.sql import func

from app.database import Base


class NSTPRecord(Base):
    __tablename__ = "nstp_records"

    id = Column(Integer, primary_key=True, index=True)
    student_id = Column(String(20), ForeignKey("students.sr_code"), nullable=False, unique=True, index=True)
    component = Column(String(20), nullable=False)
    serial_number = Column(String(100), nullable=False, unique=True, index=True)
    date_completed = Column(Date, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
