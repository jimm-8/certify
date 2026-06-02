from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, Boolean, Text
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from app.database import Base


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    username = Column(String(150), unique=True, nullable=False, index=True)
    email = Column(String(255), unique=True, nullable=False, index=True)
    hashed_password = Column(String(255), nullable=False)
    role = Column(String(50), nullable=False, server_default="user")
    permissions = Column(Text, nullable=True)
    campus_id = Column(Integer, ForeignKey("campuses.id"), nullable=True)
    is_active = Column(Boolean, default=True)
    can_process_certificates = Column(Boolean, default=False, nullable=False)
    processing_queue_limit = Column(Integer, default=5, nullable=False)
    full_name = Column(String(255), nullable=True)
    contact_number = Column(String(50), nullable=True)
    department = Column(String(255), nullable=True)

    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    campus = relationship("Campus")
