from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime

class SignatureCreate(BaseModel):
    name: str = Field(..., min_length=2, max_length=255, description="Signature name")
    title: str = Field(..., min_length=2, max_length=255, description="Position title")
    position: str = Field(..., description="Position on certificate: left, center, right")
    notes: Optional[str] = None
    uploaded_by: Optional[str] = "Admin"
    
    class Config:
        json_schema_extra = {
            "example": {
                "name": "Dr. Maria Santos",
                "title": "University Registrar",
                "position": "right",
                "notes": "Official registrar signature",
                "uploaded_by": "Admin User"
            }
        }

class SignatureResponse(BaseModel):
    id: int
    name: str
    title: str
    position: str
    file_name: str
    is_active: bool
    is_default: bool
    uploaded_by: Optional[str]
    notes: Optional[str]
    created_at: datetime
    
    class Config:
        from_attributes = True

class SignatureUpdate(BaseModel):
    name: Optional[str] = None
    title: Optional[str] = None
    position: Optional[str] = None
    is_active: Optional[bool] = None
    is_default: Optional[bool] = None
    notes: Optional[str] = None