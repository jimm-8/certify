from pydantic import BaseModel
from datetime import datetime
from typing import Optional

class AuditLogResponse(BaseModel):
    id: int
    request_id: int
    action: str
    field_name: Optional[str]
    old_value: Optional[str]
    new_value: Optional[str]
    user_name: Optional[str]
    notes: Optional[str]
    created_at: datetime
    
    class Config:
        from_attributes = True

class RequestNoteCreate(BaseModel):
    note: str
    note_type: str = "INFO"  # INFO, WARNING, REJECTION_REASON
    user_name: Optional[str] = "System"

class RequestNoteResponse(BaseModel):
    id: int
    request_id: int
    note: str
    note_type: str
    user_name: Optional[str]
    created_at: datetime
    
    class Config:
        from_attributes = True