from sqlalchemy import Column, Integer, String, DateTime, ForeignKey
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from app.database import Base

class Student(Base):
    __tablename__ = "students"

    id = Column(Integer, primary_key=True, index=True)
    sr_code = Column(String(20), unique=True, nullable=False, index=True)

    first_name = Column(String(100), nullable=False)
    middle_name = Column(String(100), nullable=True)
    last_name = Column(String(100), nullable=False)

    program_id = Column(Integer, ForeignKey("programs.id"), nullable=False)

    major = Column(String(255), nullable=True)
    year_level = Column(String(20), nullable=True)
    email = Column(String(255), nullable=True)
    contact_number = Column(String(20), nullable=True)

    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    program = relationship("Program", back_populates="students")