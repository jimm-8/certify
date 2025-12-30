from sqlalchemy import Column, Integer, String, Text, DateTime, Enum, ForeignKey
from sqlalchemy.sql import func
from app.database import Base
import enum

# Request statuses
class RequestStatus(str, enum.Enum):
    SUBMITTED = "SUBMITTED"
    PENDING = "PENDING"
    APPROVED = "APPROVED"
    PROCESSING = "PROCESSING"
    FOR_REVIEW = "FOR_REVIEW"
    FOR_RELEASING = "FOR_RELEASING"
    COMPLETED = "COMPLETED"
    REJECTED = "REJECTED"

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
    
    certificate_type_id = Column(Integer, nullable=False)
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
    
    signature_path = Column(String(500), nullable=True)

    verification_token = Column(String(100), unique=True, nullable=True, index=True)
    pdf_path = Column(String(500), nullable=True)
    rejection_reason = Column(String(100), nullable=True)
    rejection_notes = Column(Text, nullable=True)
    
    status = Column(Enum(RequestStatus), default=RequestStatus.SUBMITTED, nullable=False)
    
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

class RequestNote(Base):
    __tablename__ = "request_notes"
    
    id = Column(Integer, primary_key=True, index=True)
    request_id = Column(Integer, ForeignKey("certificate_requests.id"), nullable=False, index=True)
    
    note = Column(Text, nullable=False)
    note_type = Column(String(50), nullable=False)  # "INFO", "WARNING", "REJECTION_REASON", etc.
    
    # Who added the note
    user_id = Column(Integer, nullable=True)
    user_name = Column(String(255), nullable=True)
    
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    def __repr__(self):
        return f"<RequestNote {self.id} for request {self.request_id}>"