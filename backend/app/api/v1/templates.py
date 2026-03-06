from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List

from app.certificate_dependencies import dependency_variants_payload
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

    return [
        CertificateTypeResponse(
            id=cert.id,
            name=cert.name,
            description=cert.description,
            is_active=cert.is_active,
            created_at=cert.created_at,
            updated_at=cert.updated_at,
            dependency_variants=dependency_variants_payload(cert.name),
        )
        for cert in cert_types
    ]
