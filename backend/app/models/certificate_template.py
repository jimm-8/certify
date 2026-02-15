from sqlalchemy import Column, Integer, String, Text, JSON, Boolean, DateTime
from sqlalchemy.orm import relationship
from datetime import datetime
from app.database import Base

class CertificateTemplate(Base):
    __tablename__ = "certificate_templates"
    
    id = Column(Integer, primary_key=True, index=True)
    template_name = Column(String(200), unique=True)
    template_code = Column(String(50), unique=True)
    
    # Core template data
    header_text = Column(String(500))
    body_template = Column(Text)  # With {placeholders}
    footer_text = Column(String(500))
    
    # Layout configuration (JSON)
    layout_config = Column(JSON, default={
        "margins": {"top": 80, "bottom": 50, "left": 50, "right": 50},
        "title_position": {"x": "center", "y": 200},
        "body_position": {"x": 100, "y": 300},
        "signature_layout": "dual"  # or "single", "triple"
    })
    
    # Required fields for this certificate
    required_fields = Column(JSON, default=[])
    
    # Relationships
    requests = relationship("CertificateRequest", back_populates="template")
    
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)