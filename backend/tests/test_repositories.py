import os
import sys
from datetime import datetime

from sqlalchemy import create_engine, case
from sqlalchemy.orm import sessionmaker

sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from app.database import Base
from app.models.audit_log import AuditLog
from app.models.authorized_official import AuthorizedOfficial
from app.models.campus import Campus
from app.models.certificate import Certificate
from app.models.certificate_request import CertificateRequest, CertificateType, RequestStatus
from app.models.college import College
from app.models.course import Course
from app.models.curriculum import Curriculum
from app.models.enrollment import Enrollment
from app.models.graduation_record import GraduationRecordNew
from app.models.nstp_record import NSTPRecord
from app.models.payment import Payment
from app.models.program import Program
from app.models.student import Student
from app.models.student_address import StudentAddress
from app.models.student_course import StudentCourse
from app.models.student_id_record import StudentIdRecord

from app.repositories import (
    AuditLogRepository,
    AuthorizedOfficialRepository,
    CampusRepository,
    CertificateRepository,
    CertificateRequestRepository,
    CertificateTypeRepository,
    CourseRepository,
    CurriculumRepository,
    EnrollmentRepository,
    GraduationRecordRepository,
    NSTPRecordRepository,
    PaymentRepository,
    ProgramRepository,
    StudentAddressRepository,
    StudentCourseRepository,
    StudentIdRecordRepository,
    StudentRepository,
)


def _make_session():
    engine = create_engine("sqlite:///:memory:", connect_args={"check_same_thread": False})
    Base.metadata.create_all(engine)
    Session = sessionmaker(bind=engine)
    return Session()


def _seed_basic(db):
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
    program_inactive = Program(
        name="BSIT",
        code="BSIT",
        college_id=college.id,
        campus_id=campus.id,
        is_active=0,
    )
    db.add_all([program, program_inactive])
    db.commit()

    student = Student(
        sr_code="22-00001",
        first_name="Ada",
        last_name="Lovelace",
        program_id=program.id,
        campus_id=campus.id,
    )
    db.add(student)
    db.commit()

    return {
        "campus": campus,
        "college": college,
        "program": program,
        "program_inactive": program_inactive,
        "student": student,
    }


def test_repository_helpers_core():
    db = _make_session()
    seed = _seed_basic(db)

    campus_repo = CampusRepository(db)
    assert campus_repo.get_by_name("Main Campus").id == seed["campus"].id

    program_repo = ProgramRepository(db)
    assert program_repo.get_by_name("BSCS").id == seed["program"].id
    assert program_repo.active().count() == 1

    student_repo = StudentRepository(db)
    assert student_repo.get_by_sr_code("22-00001").id == seed["student"].id

    # Student address helpers
    addr_repo = StudentAddressRepository(db)
    a1 = StudentAddress(
        student_id=seed["student"].id,
        address_line="Street 1",
        city="City",
        province="Prov",
        zip_code="1000",
        country="PH",
    )
    a2 = StudentAddress(
        student_id=seed["student"].id,
        address_line="Street 2",
        city="City",
        province="Prov",
        zip_code="1000",
        country="PH",
    )
    db.add_all([a1, a2])
    db.commit()
    assert addr_repo.latest_for_student(seed["student"].id).address_line == "Street 2"


def test_certificate_request_and_payment_helpers():
    db = _make_session()
    seed = _seed_basic(db)

    cert_type = CertificateType(name="Cert A", description="Test", is_active=1)
    db.add(cert_type)
    db.commit()

    request = CertificateRequest(
        reference_number="REF-001",
        pin="1234",
        certificate_type_id=cert_type.id,
        certificate_type_name=cert_type.name,
        requestor_name="Req",
        requestor_address="Addr",
        requestor_relationship="Self",
        requestor_contact="0917",
        requestor_email="req@example.com",
        purpose="Test",
        sr_code=seed["student"].sr_code,
        student_name="Ada Lovelace",
        program=seed["program"].name,
        status=RequestStatus.APPROVED,
    )
    db.add(request)
    db.commit()

    req_repo = CertificateRequestRepository(db)
    assert req_repo.get_by_reference("REF-001").id == request.id
    assert req_repo.get_by_reference_and_pin("REF-001", "1234").id == request.id

    payment = Payment(
        sr_code=seed["student"].sr_code,
        payer_name="Req",
        purpose=f"Certificate Request {request.reference_number} - {cert_type.name}",
        amount=100,
    )
    db.add(payment)
    db.commit()

    pay_repo = PaymentRepository(db)
    assert pay_repo.get_by_reference("REF-001").id == payment.id

    # Certificate helper
    cert = Certificate(
        certificate_request_id=request.id,
        certificate_type_id=cert_type.id,
        issued_to="Ada Lovelace",
    )
    db.add(cert)
    db.commit()
    cert_repo = CertificateRepository(db)
    assert cert_repo.get_by_request_id(request.id).id == cert.id

    # Certificate type helpers
    ct_repo = CertificateTypeRepository(db)
    assert ct_repo.get_active_by_id(cert_type.id).id == cert_type.id
    assert ct_repo.active().count() == 1


def test_audit_and_signature_helpers():
    db = _make_session()
    seed = _seed_basic(db)

    audit_repo = AuditLogRepository(db)
    db.add_all(
        [
            AuditLog(
                action="NOTE_ADDED",
                entity_type="certificate_request",
                entity_id=1,
                new_value="Note 1",
            ),
            AuditLog(
                action="STATUS_CHANGED",
                entity_type="certificate_request",
                entity_id=1,
                new_value="APPROVED",
            ),
        ]
    )
    db.commit()

    assert audit_repo.request_notes(1).count() == 1
    assert audit_repo.for_request(1).count() == 2

    sig_repo = AuthorizedOfficialRepository(db)
    sig1 = AuthorizedOfficial(name="A", title="Registrar", campus_id=seed["campus"].id, is_active=False)
    sig2 = AuthorizedOfficial(name="B", title="Registrar", campus_id=seed["campus"].id, is_active=True)
    db.add_all([sig1, sig2])
    db.commit()

    assert sig_repo.latest_active().id == sig2.id


def test_academic_helpers():
    db = _make_session()
    seed = _seed_basic(db)

    # Enrollment helpers
    e1 = Enrollment(
        student_id=seed["student"].sr_code,
        academic_year="2022-2023",
        semester="1st",
        year_level=1,
        total_units=21,
    )
    e2 = Enrollment(
        student_id=seed["student"].sr_code,
        academic_year="2023-2024",
        semester="2nd",
        year_level=2,
        total_units=24,
    )
    db.add_all([e1, e2])
    db.commit()

    semester_order = case((Enrollment.semester == "1st", 1), (Enrollment.semester == "2nd", 2), else_=9)
    enroll_repo = EnrollmentRepository(db)
    assert enroll_repo.latest_for_student(seed["student"].sr_code, semester_order).id == e2.id

    # Graduation record helpers
    g1 = GraduationRecordNew(
        sr_code=seed["student"].sr_code,
        student_name="Ada Lovelace",
        is_graduated=False,
    )
    g2 = GraduationRecordNew(
        sr_code=seed["student"].sr_code,
        student_name="Ada Lovelace",
        is_graduated=True,
    )
    db.add_all([g1, g2])
    db.commit()
    grad_repo = GraduationRecordRepository(db)
    assert grad_repo.get_by_sr_code(seed["student"].sr_code).id == g1.id
    assert grad_repo.get_by_student_name("Ada Lovelace").id == g2.id

    # NSTP record helper
    nstp = NSTPRecord(
        student_id=seed["student"].sr_code,
        component="ROTC",
        serial_number="NSTP-0001",
        date_completed=datetime(2024, 5, 1).date(),
    )
    db.add(nstp)
    db.commit()
    nstp_repo = NSTPRecordRepository(db)
    assert nstp_repo.get_by_student_id(seed["student"].sr_code).id == nstp.id

    # Student ID record helper
    sid = StudentIdRecord(
        sr_code=seed["student"].sr_code,
        student_name="Ada Lovelace",
        is_currently_enrolled=True,
    )
    db.add(sid)
    db.commit()
    sid_repo = StudentIdRecordRepository(db)
    assert sid_repo.get_by_sr_code(seed["student"].sr_code).id == sid.id

    # Course + student course helpers
    course = Course(
        course_code="CS101",
        course_title="Intro",
        course_description="Basics",
        units=3,
    )
    db.add(course)
    db.commit()
    course_repo = CourseRepository(db)
    assert course_repo.get_by_code("CS101").id == course.id

    sc = StudentCourse(enrollment_id=e1.id, course_id=course.id, academic_year="2022-2023", semester="1st")
    db.add(sc)
    db.commit()
    sc_repo = StudentCourseRepository(db)
    assert sc_repo.for_enrollment(e1.id).count() == 1

    # Curriculum helpers
    curr = Curriculum(program_id=seed["program"].id, name="Curr 2024", is_active=True)
    db.add(curr)
    db.commit()
    curr_repo = CurriculumRepository(db)
    assert curr_repo.active_for_program(seed["program"].id).count() == 1
