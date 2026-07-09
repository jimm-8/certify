from pydantic import BaseModel
from datetime import datetime
from typing import Optional

class AuditLogResponse(BaseModel):
    id: int
    entity_type: str
    entity_id: Optional[int]
    action: str
    field_name: Optional[str]
    old_value: Optional[str]
    new_value: Optional[str]
    user_name: Optional[str]
    notes: Optional[str]
    created_at: datetime
    request_reference: Optional[str] = None
    request_label: Optional[str] = None
    student_name: Optional[str] = None
    owner_username: Optional[str] = None
    
    class Config:
        from_attributes = True

class RequestNoteCreate(BaseModel):
    note: str
    note_type: str = "INFO"  # INFO, WARNING, REJECTION_REASON
    user_name: Optional[str] = "System"
