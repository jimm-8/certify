import os
import sys
from datetime import datetime, timedelta

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from app.api.v1.requests import track_certificate_request
from app.database import Base
from app.models.certificate_request import CertificateRequest, CertificateType, RequestStatus


def _make_session_factory(tmp_path):
    db_file = tmp_path / "request_tracking_queue_test.sqlite"
    engine = create_engine(
        f"sqlite:///{db_file}",
        connect_args={"check_same_thread": False},
    )
    Base.metadata.create_all(engine)
    return sessionmaker(bind=engine)


def _seed_certificate_type(db):
    cert_type = CertificateType(name="Certification", description="Test", is_active=1)
    db.add(cert_type)
    db.commit()
    db.refresh(cert_type)
    return cert_type


def _make_request(db, cert_type, *, ref, pin, status, created_at, owner_username=None):
    request = CertificateRequest(
        reference_number=ref,
        pin=pin,
        request_type="certificate",
        certificate_type_id=cert_type.id,
        certificate_type_name=cert_type.name,
        requestor_name=f"Req {ref}",
        requestor_address="Addr",
        requestor_relationship="Self",
        requestor_contact="0917",
        requestor_email=f"{ref.lower()}@example.com",
        purpose="Test",
        student_name="Ada Lovelace",
        program="BSCS",
        status=status,
        owner_username=owner_username,
        created_at=created_at,
    )
    db.add(request)
    db.commit()
    db.refresh(request)
    return request


def test_track_request_returns_waiting_queue_position(tmp_path):
    Session = _make_session_factory(tmp_path)
    db = Session()
    cert_type = _seed_certificate_type(db)
    now = datetime(2026, 5, 21, 8, 0, 0)

    _make_request(
        db,
        cert_type,
        ref="REF-000",
        pin="0000",
        status=RequestStatus.PROCESSING,
        created_at=now - timedelta(minutes=1),
        owner_username="processor_a",
    )
    _make_request(
        db,
        cert_type,
        ref="REF-001",
        pin="1111",
        status=RequestStatus.APPROVED,
        created_at=now,
    )
    tracked = _make_request(
        db,
        cert_type,
        ref="REF-002",
        pin="2222",
        status=RequestStatus.APPROVED,
        created_at=now + timedelta(minutes=1),
    )
    _make_request(
        db,
        cert_type,
        ref="REF-003",
        pin="3333",
        status=RequestStatus.APPROVED,
        created_at=now + timedelta(minutes=2),
    )

    response = track_certificate_request("REF-002", "2222", db)

    db.close()

    assert response.queue_scope == "overall"
    assert response.queue_position == 3
    assert response.queue_total == 4


def test_track_request_returns_processor_queue_position(tmp_path):
    Session = _make_session_factory(tmp_path)
    db = Session()
    cert_type = _seed_certificate_type(db)
    now = datetime(2026, 5, 21, 8, 0, 0)

    _make_request(
        db,
        cert_type,
        ref="REF-010",
        pin="1010",
        status=RequestStatus.PROCESSING,
        created_at=now,
        owner_username="processor_a",
    )
    tracked = _make_request(
        db,
        cert_type,
        ref="REF-011",
        pin="1111",
        status=RequestStatus.PROCESSING,
        created_at=now + timedelta(minutes=1),
        owner_username="processor_a",
    )
    _make_request(
        db,
        cert_type,
        ref="REF-012",
        pin="1212",
        status=RequestStatus.PROCESSING,
        created_at=now + timedelta(minutes=2),
        owner_username="processor_b",
    )

    response = track_certificate_request(tracked.reference_number, tracked.pin, db)

    db.close()

    assert response.queue_scope == "overall"
    assert response.queue_position == 2
    assert response.queue_total == 3
