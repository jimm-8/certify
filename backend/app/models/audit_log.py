from sqlalchemy import Column, Integer, String, Text, DateTime, ForeignKey
from sqlalchemy.sql import func
from app.database import Base

class AuditLog(Base):
    __tablename__ = "audit_logs"
    
    id = Column(Integer, primary_key=True, index=True)
    
    # What was changed
    request_id = Column(Integer, ForeignKey("certificate_requests.id"), nullable=False, index=True)
    action = Column(String(100), nullable=False)  # "STATUS_CHANGED", "DATA_UPDATED", "NOTE_ADDED", etc.
    
    # What changed
    field_name = Column(String(100), nullable=True)  # Which field was changed
    old_value = Column(Text, nullable=True)  # Previous value
    new_value = Column(Text, nullable=True)  # New value
    
    # Who and when
    user_id = Column(Integer, nullable=True)  # We'll add users later, for now it's nullable
    user_name = Column(String(255), nullable=True)  # For now we'll store name as string
    notes = Column(Text, nullable=True)  # Optional notes
    
    # Timestamp
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    def __repr__(self):
        return f"<AuditLog {self.action} on request {self.request_id}>"