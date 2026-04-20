from __future__ import annotations

from sqlalchemy.orm import Session

from app.models.academic_summary import AcademicSummary
from app.models.audit_log import AuditLog
from app.models.authorized_official import AuthorizedOfficial
from app.models.campus import Campus
from app.models.certificate import Certificate
from app.models.certificate_request import CertificateRequest, CertificateType, RequestType
from app.models.certificate_template import CertificateTemplate
from app.models.certificate_verification import CertificateVerification
from app.models.college import College
from app.models.course import Course
from app.models.curriculum import Curriculum
from app.models.curriculum_course import CurriculumCourse
from app.models.enrollment import Enrollment
from app.models.grade import Grade
from app.models.graduation_record import GraduationRecordNew
from app.models.institution import Institution
from app.models.nstp_record import NSTPRecord
from app.models.payment import Payment
from app.models.permission import Permission
from app.models.program import Program
from app.models.role import Role
from app.models.role_permission import RolePermission
from app.models.student import Student
from app.models.student_address import StudentAddress
from app.models.student_course import StudentCourse
from app.models.student_id_record import StudentIdRecord
from app.models.user import User
from app.models.user_role import UserRole

from app.repositories.base import BaseRepository


class AcademicSummaryRepository(BaseRepository[AcademicSummary]):
    def __init__(self, db: Session):
        super().__init__(db, AcademicSummary)


class AuditLogRepository(BaseRepository[AuditLog]):
    def __init__(self, db: Session):
        super().__init__(db, AuditLog)

    def for_request(self, request_id: int):
        return (
            self.query()
            .filter(
                AuditLog.entity_type == "certificate_request",
                AuditLog.entity_id == request_id,
            )
            .order_by(AuditLog.created_at.desc())
        )

    def request_notes(self, request_id: int):
        return (
            self.query()
            .filter(
                AuditLog.entity_type == "certificate_request",
                AuditLog.entity_id == request_id,
                AuditLog.action == "NOTE_ADDED",
            )
            .order_by(AuditLog.created_at.desc())
        )


class AuthorizedOfficialRepository(BaseRepository[AuthorizedOfficial]):
    def __init__(self, db: Session):
        super().__init__(db, AuthorizedOfficial)

    def active(self):
        return self.query().filter(
            AuthorizedOfficial.is_active == True,
            AuthorizedOfficial.deleted_at.is_(None),
        )

    def latest_active(self):
        return self.active().order_by(AuthorizedOfficial.created_at.desc()).first()


class CampusRepository(BaseRepository[Campus]):
    def __init__(self, db: Session):
        super().__init__(db, Campus)

    def get_by_name(self, name: str):
        return self.query().filter(Campus.name == name).first()


class CertificateRepository(BaseRepository[Certificate]):
    def __init__(self, db: Session):
        super().__init__(db, Certificate)

    def get_by_request_id(self, request_id: int):
        return (
            self.query()
            .filter(Certificate.certificate_request_id == request_id)
            .first()
        )


class CertificateRequestRepository(BaseRepository[CertificateRequest]):
    def __init__(self, db: Session):
        super().__init__(db, CertificateRequest)

    def get_by_reference(self, reference_number: str):
        return (
            self.query()
            .filter(CertificateRequest.reference_number == reference_number)
            .first()
        )

    def get_by_reference_and_pin(self, reference_number: str, pin: str):
        return (
            self.query()
            .filter(
                CertificateRequest.reference_number == reference_number,
                CertificateRequest.pin == pin,
            )
            .first()
        )

    def latest_by_reference_prefix(self, prefix: str):
        return (
            self.query()
            .filter(CertificateRequest.or_number.like(f"{prefix}%"))
            .order_by(CertificateRequest.or_number.desc())
            .first()
        )

    def by_status(self, status):
        return self.query().filter(CertificateRequest.status == status)

    def certificates_only(self):
        return self.query().filter(
            CertificateRequest.request_type == RequestType.CERTIFICATE.value
        )


class CertificateTypeRepository(BaseRepository[CertificateType]):
    def __init__(self, db: Session):
        super().__init__(db, CertificateType)

    def active(self):
        return self.query().filter(CertificateType.is_active == 1)

    def get_active_by_id(self, type_id: int):
        return self.active().filter(CertificateType.id == type_id).first()


class CertificateTemplateRepository(BaseRepository[CertificateTemplate]):
    def __init__(self, db: Session):
        super().__init__(db, CertificateTemplate)


class CertificateVerificationRepository(BaseRepository[CertificateVerification]):
    def __init__(self, db: Session):
        super().__init__(db, CertificateVerification)


class CollegeRepository(BaseRepository[College]):
    def __init__(self, db: Session):
        super().__init__(db, College)

    def get_by_name(self, name: str):
        return self.query().filter(College.name == name).first()

    def get_by_code(self, code: str):
        return self.query().filter(College.code == code).first()


class CourseRepository(BaseRepository[Course]):
    def __init__(self, db: Session):
        super().__init__(db, Course)

    def get_by_code(self, course_code: str):
        return self.query().filter(Course.course_code == course_code).first()


class CurriculumRepository(BaseRepository[Curriculum]):
    def __init__(self, db: Session):
        super().__init__(db, Curriculum)

    def active_for_program(self, program_id: int):
        return self.query().filter(
            Curriculum.program_id == program_id,
            Curriculum.is_active == True,
        )


class CurriculumCourseRepository(BaseRepository[CurriculumCourse]):
    def __init__(self, db: Session):
        super().__init__(db, CurriculumCourse)


class EnrollmentRepository(BaseRepository[Enrollment]):
    def __init__(self, db: Session):
        super().__init__(db, Enrollment)

    def for_student(self, sr_code: str):
        return self.query().filter(Enrollment.student_id == sr_code)

    def latest_for_student(self, sr_code: str, semester_order):
        return (
            self.for_student(sr_code)
            .order_by(
                Enrollment.academic_year.desc(),
                semester_order.desc(),
                Enrollment.year_level.desc(),
            )
            .first()
        )


class GradeRepository(BaseRepository[Grade]):
    def __init__(self, db: Session):
        super().__init__(db, Grade)


class GraduationRecordRepository(BaseRepository[GraduationRecordNew]):
    def __init__(self, db: Session):
        super().__init__(db, GraduationRecordNew)

    def get_by_sr_code(self, sr_code: str):
        return self.query().filter(GraduationRecordNew.sr_code == sr_code).first()

    def get_by_student_name(self, student_name: str):
        return (
            self.query()
            .filter(GraduationRecordNew.student_name == student_name)
            .order_by(GraduationRecordNew.id.desc())
            .first()
        )


class InstitutionRepository(BaseRepository[Institution]):
    def __init__(self, db: Session):
        super().__init__(db, Institution)


class NSTPRecordRepository(BaseRepository[NSTPRecord]):
    def __init__(self, db: Session):
        super().__init__(db, NSTPRecord)

    def get_by_student_id(self, student_id: str):
        return self.query().filter(NSTPRecord.student_id == student_id).first()


class PaymentRepository(BaseRepository[Payment]):
    def __init__(self, db: Session):
        super().__init__(db, Payment)

    def get_by_reference(self, reference_number: str):
        return (
            self.query().filter(Payment.purpose.ilike(f"%{reference_number}%")).first()
        )


class PermissionRepository(BaseRepository[Permission]):
    def __init__(self, db: Session):
        super().__init__(db, Permission)

    def get_by_name(self, name: str):
        return self.query().filter(Permission.name == name).first()


class ProgramRepository(BaseRepository[Program]):
    def __init__(self, db: Session):
        super().__init__(db, Program)

    def active(self):
        return self.query().filter(Program.is_active == 1)

    def get_by_name(self, name: str):
        return self.query().filter(Program.name == name).first()


class RoleRepository(BaseRepository[Role]):
    def __init__(self, db: Session):
        super().__init__(db, Role)

    def get_by_name(self, name: str):
        return self.query().filter(Role.name == name).first()


class RolePermissionRepository(BaseRepository[RolePermission]):
    def __init__(self, db: Session):
        super().__init__(db, RolePermission)

    def for_role(self, role_id: int):
        return self.query().filter(RolePermission.role_id == role_id)


class StudentRepository(BaseRepository[Student]):
    def __init__(self, db: Session):
        super().__init__(db, Student)

    def get_by_sr_code(self, sr_code: str):
        return self.query().filter(Student.sr_code == sr_code).first()


class StudentAddressRepository(BaseRepository[StudentAddress]):
    def __init__(self, db: Session):
        super().__init__(db, StudentAddress)

    def latest_for_student(self, student_id: int):
        return (
            self.query()
            .filter(StudentAddress.student_id == student_id)
            .order_by(StudentAddress.id.desc())
            .first()
        )


class StudentCourseRepository(BaseRepository[StudentCourse]):
    def __init__(self, db: Session):
        super().__init__(db, StudentCourse)

    def for_enrollment(self, enrollment_id: int):
        return self.query().filter(StudentCourse.enrollment_id == enrollment_id)


class StudentIdRecordRepository(BaseRepository[StudentIdRecord]):
    def __init__(self, db: Session):
        super().__init__(db, StudentIdRecord)

    def get_by_sr_code(self, sr_code: str):
        return self.query().filter(StudentIdRecord.sr_code == sr_code).first()


class UserRepository(BaseRepository[User]):
    def __init__(self, db: Session):
        super().__init__(db, User)

    def get_by_username(self, username: str):
        return self.query().filter(User.username == username).first()

    def get_by_email(self, email: str):
        return self.query().filter(User.email == email).first()


class UserRoleRepository(BaseRepository[UserRole]):
    def __init__(self, db: Session):
        super().__init__(db, UserRole)

    def get_role_id_for_user(self, user_id: int):
        row = self.query().filter(UserRole.user_id == user_id).first()
        return row.role_id if row else None
