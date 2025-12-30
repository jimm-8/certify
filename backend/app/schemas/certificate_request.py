from pydantic import BaseModel, EmailStr, Field
from typing import Optional
from datetime import datetime
from enum import Enum

# Request status enum (same as in models)
class RequestStatusEnum(str, Enum):
    SUBMITTED = "SUBMITTED"
    PENDING = "PENDING"
    APPROVED = "APPROVED"
    PROCESSING = "PROCESSING"
    FOR_REVIEW = "FOR_REVIEW"
    FOR_RELEASING = "FOR_RELEASING"
    COMPLETED = "COMPLETED"
    REJECTED = "REJECTED"

# Schema for certificate type (what we send back)
class CertificateTypeResponse(BaseModel):
    id: int
    name: str
    description: Optional[str] = None
    is_active: int
    
    class Config:
        from_attributes = True  # Allows SQLAlchemy models to be converted

# Schema for creating a certificate request (what user sends us)
class CertificateRequestCreate(BaseModel):
    # Certificate info
    certificate_type_id: int = Field(..., description="ID of certificate type")
    
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
    
    # Signature (base64 encoded image data)
    signature_data: Optional[str] = Field(None, description="Base64 encoded signature image")
    
    class Config:
        json_schema_extra = {
            "example": {
                "certificate_type_id": 1,
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
                "reference_number": "REF-20241222-0001",
                "pin": "1234",
                "message": "Request submitted successfully",
                "submitted_date": "2024-12-22T10:30:00"
            }
        }

# Schema for tracking request (what we send back when user tracks)
class CertificateRequestTrackResponse(BaseModel):
    reference_number: str
    status: RequestStatusEnum
    certificate_type: str
    student_name: str
    submitted_date: datetime
    updated_date: Optional[datetime] = None
    
    class Config:
        from_attributes = True

# Schema for detailed request info (for admin/registrar view)
class CertificateRequestDetail(BaseModel):
    id: int
    reference_number: str
    status: RequestStatusEnum
    certificate_type_name: str
    
    # Requestor info
    requestor_name: str
    requestor_address: str
    requestor_relationship: str
    requestor_contact: str
    requestor_email: str
    purpose: str
    
    # Student info
    sr_code: Optional[str]
    student_name: str
    program: str
    major: Optional[str]
    year_graduated: Optional[str]

    verification_token: Optional[str] = None
    pdf_path: Optional[str] = None
    
    # Timestamps
    created_at: datetime
    updated_at: Optional[datetime]
    
    class Config:
        from_attributes = True

# Schema for updating request status
class StatusUpdateRequest(BaseModel):
    new_status: RequestStatusEnum
    notes: Optional[str] = None
    user_name: Optional[str] = "Registrar"
    
    # For rejections
    rejection_reason: Optional[str] = None
    rejection_notes: Optional[str] = None
    
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

# Schema for verification
class CertificateVerificationResponse(BaseModel):
    is_valid: bool
    message: str
    certificate_type: Optional[str] = None
    student_name: Optional[str] = None
    issue_date: Optional[datetime] = None
    status: Optional[str] = None