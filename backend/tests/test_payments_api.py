import os
import sys

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from app.api.v1 import payments as payments_api
from app.database import Base
from app.models.certificate_request import CertificateRequest, CertificateType, RequestStatus
from app.schemas.payment import PaymentCreate


def _make_session_factory(tmp_path):
    db_file = tmp_path / "payments_api_test.sqlite"
    engine = create_engine(
        f"sqlite:///{db_file}",
        connect_args={"check_same_thread": False},
    )
    Base.metadata.create_all(engine)
    return sessionmaker(bind=engine)


def _seed_processing_request(db):
    cert_type = CertificateType(name="Certification", description="Test", is_active=1)
    db.add(cert_type)
    db.commit()
    db.refresh(cert_type)

    request = CertificateRequest(
        reference_number="REF-PAY-001",
        pin="1234",
        request_type="certificate",
        certificate_type_id=cert_type.id,
        certificate_type_name=cert_type.name,
        requestor_name="Ada Lovelace",
        requestor_address="Addr",
        requestor_relationship="Self",
        requestor_contact="09171234567",
        requestor_email="ada@example.com",
        purpose="Test",
        student_name="Ada Lovelace",
        program="BSCS",
        request_cost=30,
        status=RequestStatus.PROCESSING,
        owner_username="processor1",
    )
    db.add(request)
    db.commit()
    db.refresh(request)
    return request


def test_create_payment_keeps_processing_request_status_unchanged(tmp_path, monkeypatch):
    Session = _make_session_factory(tmp_path)
    db = Session()
    request = _seed_processing_request(db)

    payment = payments_api.create_payment(
        PaymentCreate(
            request_id=request.id,
            amount=30,
            payment_method="CASH",
            payment_status="PAID",
            or_number="1234567",
        ),
        db=db,
        ctx={"user": type("UserCtx", (), {"username": "cashier1"})()},
    )

    db.refresh(request)

    assert payment.payment_status == "PAID"
    assert request.status == RequestStatus.PROCESSING

    db.close()
