from sqlalchemy import Column, Integer, String, Text, DateTime, Boolean
from sqlalchemy.sql import func
from app.database import Base

class Signature(Base):
    __tablename__ = "signatures"
    
    id = Column(Integer, primary_key=True, index=True)
    
    # Signature details
    name = Column(String(255), nullable=False)  # e.g., "Registrar Signature", "Dean Signature"
    title = Column(String(255), nullable=False)  # e.g., "Registrar", "Dean of Engineering"
    position = Column(String(100), nullable=False)  # "left", "center", "right"
    
    # File info
    file_path = Column(String(500), nullable=False)
    file_name = Column(String(255), nullable=False)
    
    # Status
    is_active = Column(Boolean, default=True)
    is_default = Column(Boolean, default=False)  # Default signature to use
    
    # Metadata
    uploaded_by = Column(String(255), nullable=True)
    notes = Column(Text, nullable=True)
    
    # Timestamps
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    def __repr__(self):
        return f"<Signature {self.name} - {self.title}>"