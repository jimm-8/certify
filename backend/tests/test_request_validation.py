import os
import sys

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from app.api.v1.requests import validate_requests
from app.database import Base
from app.models.campus import Campus
from app.models.college import College
from app.models.program import Program
from app.models.student import Student
from app.models.certificate_request import CertificateRequest, CertificateType, RequestStatus
from app.models.graduation_record import GraduationRecordNew
from app.schemas.certificate_request import RequestsValidationRequest


def _make_session_factory(tmp_path):
    db_file = tmp_path / "request_validation_test.sqlite"
    engine = create_engine(
        f"sqlite:///{db_file}",
        connect_args={"check_same_thread": False},
    )
    Base.metadata.create_all(engine)
    return sessionmaker(bind=engine)


def _seed_request(db, *, certificate_name, graduation_record=None):
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
    cert_type = CertificateType(
        name=certificate_name,
        description="Test",
        is_active=1,
    )
    db.add_all([student, cert_type])
    db.commit()

    if graduation_record is not None:
        db.add(
            GraduationRecordNew(
                sr_code=student.sr_code,
                student_name="Ada Byron Lovelace",
                **graduation_record,
            )
        )
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
        student_name="Ada Byron Lovelace",
        program=program.name,
        year_graduated="2024",
        status=RequestStatus.APPROVED,
    )
    db.add(request)
    db.commit()
    db.refresh(request)
    return request


def test_validate_requests_flags_non_graduate_gwa_requests(tmp_path):
    Session = _make_session_factory(tmp_path)
    db = Session()
    request = _seed_request(
        db,
        certificate_name="Certification of GWA",
        graduation_record={
            "is_graduated": False,
            "status": "candidate",
            "academic_year": "2023-2024",
        },
    )

    result = validate_requests(
        RequestsValidationRequest(request_ids=[request.id]),
        db=db,
    )

    db.close()

    flags = result["results"][0]["flags"]
    assert (
        "Student is not yet graduated for the requested GWA certificate."
        in flags
    )


def test_validate_requests_flags_missing_latin_honor_for_honor_graduate(tmp_path):
    Session = _make_session_factory(tmp_path)
    db = Session()
    request = _seed_request(
        db,
        certificate_name="Certification of Honor Graduate",
        graduation_record={
            "is_graduated": True,
            "status": "graduated",
            "date_of_graduation": "June 10, 2024",
            "academic_year": "2023-2024",
            "latin_honor": "",
        },
    )

    result = validate_requests(
        RequestsValidationRequest(request_ids=[request.id]),
        db=db,
    )

    db.close()

    flags = result["results"][0]["flags"]
    assert (
        "No latin honor record found for this student for the requested honor graduate certificate."
        in flags
    )


def test_validate_requests_flags_non_graduate_cav_requests(tmp_path):
    Session = _make_session_factory(tmp_path)
    db = Session()
    request = _seed_request(
        db,
        certificate_name="Certification Authentication and Verification (CAV)",
        graduation_record={
            "is_graduated": False,
            "status": "candidate",
            "academic_year": "2023-2024",
        },
    )

    result = validate_requests(
        RequestsValidationRequest(request_ids=[request.id]),
        db=db,
    )

    db.close()

    flags = result["results"][0]["flags"]
    assert (
        "Student is not yet graduated for the requested CAV certificate."
        in flags
    )
