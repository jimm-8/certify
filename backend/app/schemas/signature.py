from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime


class SignatureCreate(BaseModel):
    name: str = Field(..., min_length=2, max_length=255, description="Official name")
    title: str = Field(..., min_length=2, max_length=255, description="Official title")
    campus_id: Optional[int] = None

    class Config:
        json_schema_extra = {
            "example": {
                "name": "Dr. Maria Santos",
                "title": "University Registrar",
                "campus_id": 1
            }
        }


class SignatureResponse(BaseModel):
    id: int
    name: str
    title: str
    campus_id: Optional[int]
    signature_path: Optional[str]
    is_active: bool
    created_at: datetime

    class Config:
        from_attributes = True


class SignatureUpdate(BaseModel):
    name: Optional[str] = None
    title: Optional[str] = None
    campus_id: Optional[int] = None
    signature_path: Optional[str] = None
    is_active: Optional[bool] = None
