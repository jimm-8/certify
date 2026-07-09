from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import HTMLResponse
from sqlalchemy.orm import Session
from typing import List

from app.certificate_dependencies import dependency_variants_payload
from app.database import get_db
from app.models.certificate_request import CertificateType
from app.repositories import CertificateTypeRepository
from app.schemas.certificate_request import CertificateTypeResponse
from app.utils.template_engine import CertificateTemplateEngine

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
    
    cert_type_repo = CertificateTypeRepository(db)
    cert_types = cert_type_repo.active().order_by(CertificateType.name).all()

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


@router.get("/preview/{certificate_type_name}", response_class=HTMLResponse, include_in_schema=True)
def preview_certificate_template(
    certificate_type_name: str,
    db: Session = Depends(get_db),
):
    """
    Render and return the HTML for a certificate template for previewing.
    This returns fully rendered HTML suitable for embedding in an iframe.
    """
    engine = CertificateTemplateEngine()
    try:
        template_path = engine.resolve_template_path(certificate_type_name, {})
    except FileNotFoundError:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Template not found")

    # Sample context for preview — this can be extended or provided by the caller later
    sample_context = {
        "student": {"full_name": "Juan Dela Cruz", "student_number": "2021-0001"},
        "campus_name": "Alangilan Campus",
        "campus_address": "Golden Country Homes, Alangilan, Batangas City",
        "campus_contact": "(+63) 43 425 0139",
        "campus_email_website": "registrar@g.batstate-u.edu.ph | batstate-u.edu.ph",
        "legacy_fill_values": [],
    }

    try:
        rendered = engine.render_template(template_path, sample_context)
        return HTMLResponse(content=rendered, status_code=200)
    except Exception as exc:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(exc))
