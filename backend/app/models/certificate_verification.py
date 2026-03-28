from sqlalchemy import Column, DateTime, ForeignKey, Integer, String
from sqlalchemy.sql import func

from app.database import Base


class CertificateVerification(Base):
    __tablename__ = "certificate_verifications"

    id = Column(Integer, primary_key=True, index=True)
    certificate_id = Column(Integer, ForeignKey("certificates.id"), nullable=False, index=True)
    verification_code = Column(String(100), nullable=False, unique=True, index=True)
    verified_at = Column(DateTime(timezone=True), nullable=True)
    status = Column(String(20), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
