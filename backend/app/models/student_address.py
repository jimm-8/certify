from sqlalchemy import Column, DateTime, Integer, String, Text, ForeignKey
from sqlalchemy.sql import func

from app.database import Base


class StudentAddress(Base):
    __tablename__ = "student_address"

    id = Column(Integer, primary_key=True, index=True)
    student_id = Column(Integer, ForeignKey("students.id"), nullable=False, index=True)
    address_line = Column(Text, nullable=False)
    city = Column(String(100), nullable=True)
    province = Column(String(100), nullable=True)
    zip_code = Column(String(20), nullable=True)
    country = Column(String(100), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
