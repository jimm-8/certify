from sqlalchemy import Column, DateTime, ForeignKey, Integer, String
from sqlalchemy.sql import func

from app.database import Base


class Certificate(Base):
    __tablename__ = "certificates"

    id = Column(Integer, primary_key=True, index=True)
    certificate_request_id = Column(Integer, ForeignKey("certificate_requests.id"), nullable=False, index=True)
    certificate_type_id = Column(Integer, ForeignKey("certificate_types.id"), nullable=False, index=True)
    issued_to = Column(String(255), nullable=False)
    sr_code = Column(String(20), nullable=True)
    issued_by = Column(String(255), nullable=True)
    issued_at = Column(DateTime(timezone=True), server_default=func.now())
    or_number = Column(String(20), nullable=True)
    file_path = Column(String(500), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
