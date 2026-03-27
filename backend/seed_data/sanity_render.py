from datetime import datetime
from app.database import SessionLocal
from app.models.certificate_request import CertificateRequest, CertificateType, RequestStatus
from app.services.certificate_service import generate_certificate_pdf

sr_code = "21-00472"
cert_name = "Certification of Grades"

session = SessionLocal()
try:
    cert_type = session.query(CertificateType).filter(CertificateType.name == cert_name).first()
    if not cert_type:
        raise SystemExit(f"Certificate type not found: {cert_name}")

    ref = f"TEST-REQ-{datetime.now().strftime('%Y%m%d%H%M%S')}"
    token = f"TESTTOKEN-{datetime.now().strftime('%Y%m%d%H%M%S')}"
    req = CertificateRequest(
        reference_number=ref,
        pin="1234",
        certificate_type_id=cert_type.id,
        certificate_type_name=cert_type.name,
        requestor_name="Test Requestor",
        requestor_address="Test Address",
        requestor_relationship="Self",
        requestor_contact="09999999999",
        requestor_email="test@example.com",
        purpose="Sanity render",
        sr_code=sr_code,
        student_name="",
        program="",
        major="",
        year_graduated="",
        signature_data=None,
        verification_token=token,
        status=RequestStatus.PROCESSING,
    )
    session.add(req)
    session.commit()
    session.refresh(req)

    pdf_path = generate_certificate_pdf(session, req.id, user_name="System")
    print("Generated:", pdf_path)
finally:
    session.close()
