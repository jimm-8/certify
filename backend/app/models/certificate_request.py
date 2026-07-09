from sqlalchemy import (
    Boolean,
    Column,
    Integer,
    String,
    Text,
    DateTime,
    Enum,
    ForeignKey,
    Numeric,
)
from sqlalchemy.sql import func
from app.database import Base
import enum


class RequestType(str, enum.Enum):
    CERTIFICATE = "certificate"
    DOCUMENT = "document"


# Request statuses
class RequestStatus(str, enum.Enum):
    SUBMITTED = "SUBMITTED"
    PENDING = "PENDING"
    APPROVED = "APPROVED"
    REJECTED = "REJECTED"
    PROCESSING = "PROCESSING"
    FOR_RELEASING = "FOR_RELEASING"
    RELEASED = "RELEASED"


class AutoPrintStatus(str, enum.Enum):
    REQUESTED = "REQUESTED"
    SENDING = "SENDING"
    SUBMITTED = "SUBMITTED"
    COMPLETED = "COMPLETED"
    FAILED = "FAILED"


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
    control_num = Column(String(20), nullable=True, index=True)

    request_type = Column(
        String(50),
        nullable=False,
        default=RequestType.CERTIFICATE.value,
        server_default=RequestType.CERTIFICATE.value,
        index=True,
    )
    requested_document_name = Column(String(255), nullable=True)

    certificate_type_id = Column(
        Integer, ForeignKey("certificate_types.id"), nullable=True
    )
    certificate_type_name = Column(String(255), nullable=True)

    requestor_name = Column(String(255), nullable=False)
    requestor_address = Column(Text, nullable=False)
    requestor_relationship = Column(String(50), nullable=False)
    requestor_contact = Column(String(20), nullable=False)
    requestor_email = Column(String(255), nullable=False)
    purpose = Column(Text, nullable=False)
    purpose_normalized = Column(Text, nullable=True)
    purpose_category = Column(String(50), nullable=False, default="OTHER")
    purpose_extracted_notes = Column(Text, nullable=True)
    needs_instruction_review = Column(Boolean, nullable=False, default=False)

    sr_code = Column(String(20), nullable=True)
    student_name = Column(String(255), nullable=False)
    program = Column(String(255), nullable=False)
    major = Column(String(255), nullable=True)
    year_graduated = Column(String(10), nullable=True)

    signature_data = Column(Text, nullable=True)

    # JSON-encoded list of selected course codes for course description certificates
    course_description_selection = Column(Text, nullable=True)
    # JSON-encoded list of selected grade row keys for certification of grades
    grade_selection = Column(Text, nullable=True)

    verification_token = Column(String(100), unique=True, nullable=True, index=True)
    pdf_path = Column(String(500), nullable=True)
    pdf_generated_at = Column(DateTime(timezone=True), nullable=True)
    pdf_generation_time_ms = Column(Integer, nullable=True)
    request_cost = Column(Numeric(10, 2), nullable=True)
    processing_hold_active = Column(Boolean, nullable=False, default=False)
    processing_hold_started_at = Column(DateTime(timezone=True), nullable=True)
    processing_hold_total_seconds = Column(Integer, nullable=False, default=0)
    processing_hold_reason = Column(Text, nullable=True)
    processing_hold_source = Column(String(32), nullable=True)
    ready_email_sent_at = Column(DateTime(timezone=True), nullable=True)
    for_releasing_started_at = Column(DateTime(timezone=True), nullable=True)
    release_hold_active = Column(Boolean, nullable=False, default=False)
    release_hold_started_at = Column(DateTime(timezone=True), nullable=True)
    release_hold_total_seconds = Column(Integer, nullable=False, default=0)
    release_hold_reason = Column(Text, nullable=True)
    release_hold_source = Column(String(32), nullable=True)
    auto_print_requested_at = Column(DateTime(timezone=True), nullable=True)
    auto_printed_at = Column(DateTime(timezone=True), nullable=True)
    auto_print_status = Column(String(32), nullable=True)
    auto_print_job_id = Column(String(120), nullable=True, index=True)
    auto_print_error = Column(Text, nullable=True)
    auto_print_confirmed_at = Column(DateTime(timezone=True), nullable=True)
    owner_username = Column(String(255), nullable=True, index=True)

    status = Column(
        Enum(RequestStatus), default=RequestStatus.SUBMITTED, nullable=False
    )

    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    @property
    def request_label(self):
        return self.certificate_type_name or self.requested_document_name or "Request"

    @property
    def is_certificate_request(self):
        return self.request_type == RequestType.CERTIFICATE.value

    @property
    def or_number(self):
        """Backward-compatible alias for older code paths."""
        return self.control_num

    @or_number.setter
    def or_number(self, value):
        self.control_num = value
