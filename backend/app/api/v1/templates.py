from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List

from app.database import get_db
from app.models.certificate_request import CertificateType
from app.schemas.certificate_request import CertificateTypeResponse

# Create router
router = APIRouter(prefix="/certificate-types", tags=["Certificate Types"])

# Get all certificate types
@router.get("/", response_model=List[CertificateTypeResponse])
def get_certificate_types(
    db: Session = Depends(get_db)
):
    """
    Get all available certificate types
    
    Returns a list of all certificate types that can be requested.
    """
    
    cert_types = db.query(CertificateType).filter(
        CertificateType.is_active == 1
    ).order_by(CertificateType.name).all()
    
    return cert_types