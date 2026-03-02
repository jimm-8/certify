from sqlalchemy import Column, Integer, String, ForeignKey, DateTime
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from app.database import Base

class Program(Base):
    __tablename__ = "programs"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(255), nullable=False)
    code = Column(String(50), nullable=True)

    major = Column(String(255), nullable=True)
    college_id = Column(Integer, ForeignKey("colleges.id"), nullable=False)
    campus_id = Column(Integer, ForeignKey("campuses.id"), nullable=False)

    is_active = Column(Integer, default=1)

    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    campus = relationship("Campus", back_populates="programs")
    students = relationship("Student", back_populates="program")
    college = relationship("College", back_populates="programs")