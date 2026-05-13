from pydantic import BaseModel, EmailStr, Field, field_validator, model_validator
from typing import Optional
from datetime import datetime
from enum import Enum

# Request status enum (same as in models)
class RequestStatusEnum(str, Enum):
    SUBMITTED = "SUBMITTED"
    PENDING = "PENDING"
    APPROVED = "APPROVED"
    REJECTED = "REJECTED"
    PROCESSING = "PROCESSING"
    FOR_RELEASING = "FOR_RELEASING"
    RELEASED = "RELEASED"


class RequestTypeEnum(str, Enum):
    CERTIFICATE = "certificate"
    DOCUMENT = "document"


class AutoPrintStatusEnum(str, Enum):
    REQUESTED = "REQUESTED"
    SENDING = "SENDING"
    SUBMITTED = "SUBMITTED"
    COMPLETED = "COMPLETED"
    FAILED = "FAILED"


LEGACY_AUTO_PRINT_STATUS_MAP = {
    "queued": AutoPrintStatusEnum.REQUESTED,
    "requested": AutoPrintStatusEnum.REQUESTED,
    "sending": AutoPrintStatusEnum.SENDING,
    "submitted": AutoPrintStatusEnum.SUBMITTED,
    "completed": AutoPrintStatusEnum.COMPLETED,
    "printed": AutoPrintStatusEnum.COMPLETED,
    "done": AutoPrintStatusEnum.COMPLETED,
    "failed": AutoPrintStatusEnum.FAILED,
    "error": AutoPrintStatusEnum.FAILED,
    "offline": AutoPrintStatusEnum.FAILED,
}

# Schema for certificate type (what we send back)
class CertificateDependencyField(BaseModel):
    key: str
    label: str


class CertificateDependencyVariant(BaseModel):
    key: str
    label: str
    fields: list[CertificateDependencyField] = Field(default_factory=list)


class CertificateTypeResponse(BaseModel):
    id: int
    name: str
    description: Optional[str] = None
    is_active: int
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None
    dependency_variants: list[CertificateDependencyVariant] = Field(default_factory=list)
    
    class Config:
        from_attributes = True

# Schema for creating a certificate request (what user sends us)
class CertificateRequestCreate(BaseModel):
    request_type: RequestTypeEnum = Field(
        RequestTypeEnum.CERTIFICATE,
        description="Kind of request being submitted",
    )
    requested_document_name: Optional[str] = Field(
        None, description="Requested non-certificate document name"
    )
    certificate_type_id: Optional[int] = Field(
        None, description="ID of certificate type"
    )
    
    # Requesting individual's information
    requestor_name: str = Field(..., min_length=2, max_length=255, description="Full name of requestor")
    requestor_address: str = Field(..., min_length=5, description="Current address")
    requestor_relationship: str = Field(..., description="Relationship to student")
    requestor_contact: str = Field(..., min_length=10, max_length=20, description="Contact number")
    requestor_email: EmailStr = Field(..., description="Email address")
    purpose: str = Field(..., min_length=5, description="Purpose of request")
    
    # Student information
    sr_code: Optional[str] = Field(None, max_length=20, description="Student SR Code (optional)")
    student_name: str = Field(..., min_length=2, max_length=255, description="Full name of student")
    program: str = Field(..., min_length=2, max_length=255, description="Program/Course")
    major: Optional[str] = Field(None, max_length=255, description="Major (optional)")
    year_graduated: Optional[str] = Field(None, max_length=10, description="Year graduated")

    # Request cost (unit cost from selected document)
    request_cost: Optional[float] = Field(None, description="Requested document cost")
    
    # Signature (base64 encoded image data)
    signature_data: Optional[str] = Field(None, description="Base64 encoded signature image")

    @model_validator(mode="after")
    def validate_request_kind(self):
        requested_document_name = (self.requested_document_name or "").strip()

        if self.request_type == RequestTypeEnum.CERTIFICATE:
            if not self.certificate_type_id:
                raise ValueError(
                    "certificate_type_id is required for certificate requests"
                )
        elif self.request_type == RequestTypeEnum.DOCUMENT:
            if not requested_document_name:
                raise ValueError(
                    "requested_document_name is required for document requests"
                )
            self.requested_document_name = requested_document_name

        return self
    
    class Config:
        json_schema_extra = {
            "example": {
                "certificate_type_id": 1,
                "request_type": "certificate",
                "requestor_name": "Juan Dela Cruz",
                "requestor_address": "123 Main St, Manila, Philippines",
                "requestor_relationship": "Self",
                "requestor_contact": "09171234567",
                "requestor_email": "juan@email.com",
                "purpose": "Job Application",
                "sr_code": "22-00001",
                "student_name": "Juan Dela Cruz",
                "program": "BS Computer Engineering",
                "major": "Software Engineering",
                "year_graduated": "2024",
                "request_cost": 30.00,
                "signature_data": "base64_image_data_here"
            }
        }

# Schema for the response after creating request (what we send back)
class CertificateRequestResponse(BaseModel):
    reference_number: str
    pin: str
    message: str
    submitted_date: datetime
    
    class Config:
        json_schema_extra = {
            "example": {
                "reference_number": "25-0218-01234",
                "pin": "1234",
                "message": "Request submitted successfully",
                "submitted_date": "2024-12-22T10:30:00"
            }
        }

# Schema for tracking request (what we send back when user tracks)
class CertificateRequestTrackResponse(BaseModel):
    reference_number: str
    status: RequestStatusEnum
    request_type: RequestTypeEnum
    requested_document_name: Optional[str] = None
    certificate_type: Optional[str] = None
    request_label: str
    student_name: str
    submitted_date: datetime
    updated_date: Optional[datetime] = None
    
    class Config:
        from_attributes = True

# Schema for detailed request info (for admin/registrar view)
class CertificateRequestDetail(BaseModel):
    id: int
    reference_number: str
    request_type: RequestTypeEnum
    requested_document_name: Optional[str] = None
    request_label: Optional[str] = None
    status: RequestStatusEnum
    certificate_type_name: Optional[str] = None
    control_num: Optional[str] = None
    or_number: Optional[str] = None
    
    # Requestor info
    requestor_name: str
    requestor_address: str
    requestor_relationship: str
    requestor_contact: str
    requestor_email: str
    purpose: str
    purpose_normalized: Optional[str] = None
    purpose_category: Optional[str] = None
    purpose_extracted_notes: Optional[str] = None
    needs_instruction_review: bool = False

    # Student info
    sr_code: Optional[str]
    student_name: str
    program: str
    major: Optional[str]
    year_graduated: Optional[str]
    request_cost: Optional[float] = None
    course_description_selection: Optional[str] = None
    grade_selection: Optional[str] = None
    ready_email_sent_at: Optional[datetime] = None
    processing_hold_active: bool = False
    processing_hold_started_at: Optional[datetime] = None
    processing_hold_total_seconds: Optional[int] = 0
    processing_hold_reason: Optional[str] = None
    processing_hold_source: Optional[str] = None
    for_releasing_started_at: Optional[datetime] = None
    release_hold_active: bool = False
    release_hold_started_at: Optional[datetime] = None
    release_hold_total_seconds: Optional[int] = 0
    release_hold_reason: Optional[str] = None
    release_hold_source: Optional[str] = None
    auto_print_requested_at: Optional[datetime] = None
    auto_printed_at: Optional[datetime] = None
    auto_print_status: Optional[AutoPrintStatusEnum] = None
    auto_print_job_id: Optional[str] = None
    auto_print_error: Optional[str] = None
    auto_print_confirmed_at: Optional[datetime] = None
    owner_username: Optional[str] = None

    verification_token: Optional[str] = None
    pdf_path: Optional[str] = None
    signature_data: Optional[str] = None
    
    # Timestamps
    created_at: datetime
    updated_at: Optional[datetime]

    @field_validator("auto_print_status", mode="before")
    @classmethod
    def normalize_auto_print_status(cls, value):
        if value is None or isinstance(value, AutoPrintStatusEnum):
            return value

        normalized = LEGACY_AUTO_PRINT_STATUS_MAP.get(
            str(value).strip().lower()
        )
        return normalized or value
    
    class Config:
        from_attributes = True


class RequestsValidationRequest(BaseModel):
    request_ids: list[int] = Field(default_factory=list)


class RequestValidationResult(BaseModel):
    request_id: int
    exists: bool = False
    flags: list[str] = Field(default_factory=list)


class RequestsValidationResponse(BaseModel):
    results: list[RequestValidationResult] = Field(default_factory=list)


class RejectionEmailRequest(BaseModel):
    notes: Optional[str] = None


class DelayNoticeRequest(BaseModel):
    reason: Optional[str] = None


class CheckingEmailRequest(BaseModel):
    subject: str = Field(..., min_length=1, max_length=255)
    message: str = Field(..., min_length=1)

# Schema for updating request status
class StatusUpdateRequest(BaseModel):
    new_status: RequestStatusEnum
    notes: Optional[str] = None
    user_name: Optional[str] = "Registrar"
    
    class Config:
        json_schema_extra = {
            "example": {
                "new_status": "APPROVED",
                "notes": "All documents verified",
                "user_name": "Maria Santos"
            }
        }

# Schema for updating student data
class StudentDataUpdate(BaseModel):
    sr_code: Optional[str] = None
    student_name: Optional[str] = None
    program: Optional[str] = None
    major: Optional[str] = None
    year_graduated: Optional[str] = None
    notes: Optional[str] = None
    user_name: Optional[str] = "Registrar"


class CourseDescriptionSelectionUpdate(BaseModel):
    course_codes: list[str] = Field(default_factory=list)
    notes: Optional[str] = None
    user_name: Optional[str] = "Registrar"


class GradeSelectionUpdate(BaseModel):
    selection_keys: list[str] = Field(default_factory=list)
    notes: Optional[str] = None
    user_name: Optional[str] = "Registrar"

# Schema for verification
class CertificateVerificationResponse(BaseModel):
    is_valid: bool
    message: str
    certificate_type: Optional[str] = None
    student_name: Optional[str] = None
    issue_date: Optional[datetime] = None
    status: Optional[str] = None
