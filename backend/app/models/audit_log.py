from sqlalchemy import Column, Integer, String, Text, DateTime
from sqlalchemy.sql import func
from app.database import Base

class AuditLog(Base):
    __tablename__ = "audit_logs"
    
    id = Column(Integer, primary_key=True, index=True)
    
    # Who and when
    user_id = Column(Integer, nullable=True)
    user_name = Column(String(255), nullable=True)

    # What happened
    action = Column(String(100), nullable=False)  # "STATUS_CHANGED", "DATA_UPDATED", "NOTE_ADDED", etc.
    entity_type = Column(String(50), nullable=False)  # "certificate_request", "student", etc.
    entity_id = Column(Integer, nullable=True)

    # What changed
    field_name = Column(String(100), nullable=True)
    old_value = Column(Text, nullable=True)
    new_value = Column(Text, nullable=True)

    notes = Column(Text, nullable=True)

    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    def __repr__(self):
        return f"<AuditLog {self.action} on {self.entity_type}:{self.entity_id}>"
