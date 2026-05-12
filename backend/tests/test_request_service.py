import asyncio
import os
import sys

import pytest
from fastapi import HTTPException
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from app.database import Base
from app.models.campus import Campus
from app.models.college import College
from app.models.program import Program
from app.models.student import Student
from app.models.certificate_request import (
    CertificateRequest,
    CertificateType,
    RequestStatus,
)
from app.repositories.models import CertificateRequestRepository
from app.services.request_service import update_request_status


def _make_session_factory(tmp_path):
    db_file = tmp_path / "request_service_test.sqlite"
    engine = create_engine(
        f"sqlite:///{db_file}",
        connect_args={"check_same_thread": False},
    )
    Base.metadata.create_all(engine)
    return sessionmaker(bind=engine)


def _seed_request(db):
    campus = Campus(name="Main Campus")
    college = College(name="Engineering", code="ENG")
    db.add_all([campus, college])
    db.commit()

    program = Program(
        name="BSCS",
        code="BSCS",
        college_id=college.id,
        campus_id=campus.id,
        is_active=1,
    )
    db.add(program)
    db.commit()

    student = Student(
        sr_code="22-00001",
        first_name="Ada",
        middle_name="Byron",
        last_name="Lovelace",
        program_id=program.id,
        campus_id=campus.id,
    )
    cert_type = CertificateType(name="Certification", description="Test", is_active=1)
    db.add_all([student, cert_type])
    db.commit()

    request = CertificateRequest(
        reference_number="REF-001",
        pin="1234",
        request_type="certificate",
        certificate_type_id=cert_type.id,
        certificate_type_name=cert_type.name,
        requestor_name="Req",
        requestor_address="Addr",
        requestor_relationship="Self",
        requestor_contact="0917",
        requestor_email="req@example.com",
        purpose="Test",
        sr_code=student.sr_code,
        student_name="Ada Lovelace",
        program=program.name,
        status=RequestStatus.APPROVED,
    )
    db.add(request)
    db.commit()
    db.refresh(request)
    return request


def test_processing_claim_conflicts_when_another_user_wins(tmp_path, monkeypatch):
    Session = _make_session_factory(tmp_path)
    db = Session()
    request = _seed_request(db)

    original_query = CertificateRequestRepository.query
    state = {"calls": 0}

    def raced_query(self):
        state["calls"] += 1
        actual_query = original_query(self)

        if state["calls"] != 2 or self.model is not CertificateRequest:
            return actual_query

        class _RaceQuery:
            def __init__(self, filtered_query):
                self.filtered_query = filtered_query

            def filter(self, *criteria):
                filtered = self.filtered_query.filter(*criteria)

                class _RaceFilter:
                    def __init__(self, update_query):
                        self.update_query = update_query

                    def update(self, values, synchronize_session=False):
                        competing_db = Session()
                        try:
                            competing_request = (
                                competing_db.query(CertificateRequest)
                                .filter(CertificateRequest.id == request.id)
                                .first()
                            )
                            competing_request.status = RequestStatus.PROCESSING
                            competing_request.owner_username = "winner_user"
                            competing_db.commit()
                        finally:
                            competing_db.close()

                        return 0

                return _RaceFilter(filtered)

        return _RaceQuery(actual_query)

    monkeypatch.setattr(CertificateRequestRepository, "query", raced_query)

    with pytest.raises(HTTPException) as exc_info:
        asyncio.run(
            update_request_status(
                db=db,
                request_id=request.id,
                new_status=RequestStatus.PROCESSING,
                user_name="loser_user",
                notes="Request moved to processing",
            )
        )

    db.close()

    assert exc_info.value.status_code == 409
    assert "winner_user" in exc_info.value.detail
