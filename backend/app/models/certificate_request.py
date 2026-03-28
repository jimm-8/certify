from sqlalchemy import Column, Integer, String, Text, DateTime, Enum, ForeignKey, Numeric
from sqlalchemy.sql import func
from app.database import Base
import enum

# Request statuses
class RequestStatus(str, enum.Enum):
    SUBMITTED = "SUBMITTED"
    PENDING = "PENDING"
    APPROVED = "APPROVED"
    PROCESSING = "PROCESSING"
    FOR_RELEASING = "FOR_RELEASING"
    RELEASED = "RELEASED"

# Certificate types table
class CertificateType(Base):
    __tablename__ = "certificate_types"
    
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(255), unique=True, nullable=False)
    description = Column(Text, nullable=True)
    is_active = Column(Integer, default=1)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

# Certificate requests table
class CertificateRequest(Base):
    __tablename__ = "certificate_requests"
    
    id = Column(Integer, primary_key=True, index=True)
    reference_number = Column(String(50), unique=True, nullable=False, index=True)
    pin = Column(String(4), nullable=False)
    or_number = Column(String(20), nullable=True, index=True)
    
    certificate_type_id = Column(Integer, ForeignKey("certificate_types.id"), nullable=False)
    certificate_type_name = Column(String(255), nullable=False)
    
    requestor_name = Column(String(255), nullable=False)
    requestor_address = Column(Text, nullable=False)
    requestor_relationship = Column(String(50), nullable=False)
    requestor_contact = Column(String(20), nullable=False)
    requestor_email = Column(String(255), nullable=False)
    purpose = Column(Text, nullable=False)
    
    sr_code = Column(String(20), nullable=True)
    student_name = Column(String(255), nullable=False)
    program = Column(String(255), nullable=False)
    major = Column(String(255), nullable=True)
    year_graduated = Column(String(10), nullable=True)
    
    signature_data = Column(Text, nullable=True)

    verification_token = Column(String(100), unique=True, nullable=True, index=True)
    pdf_path = Column(String(500), nullable=True)
    request_cost = Column(Numeric(10, 2), nullable=True)
    
    status = Column(Enum(RequestStatus), default=RequestStatus.SUBMITTED, nullable=False)
    
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

