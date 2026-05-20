from __future__ import annotations

import re

from sqlalchemy import case, or_
from sqlalchemy.orm import Session

from app.models.academic_summary import AcademicSummary
from app.models.audit_log import AuditLog
from app.models.authorized_official import AuthorizedOfficial
from app.models.campus import Campus
from app.models.certificate import Certificate
from app.models.certificate_request import (
    CertificateRequest,
    CertificateType,
    RequestType,
)
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


NAME_SUFFIXES = {"jr", "sr", "ii", "iii", "iv", "v"}


def _name_tokens(value: str) -> list[str]:
    tokens = [token.lower() for token in re.findall(r"[A-Za-z]+", str(value or ""))]
    return [token for token in tokens if token not in NAME_SUFFIXES]


def _student_name_variants(student: Student) -> list[list[str]]:
    first = _name_tokens(getattr(student, "first_name", ""))
    middle = _name_tokens(getattr(student, "middle_name", ""))
    last = _name_tokens(getattr(student, "last_name", ""))
    variants = []

    normal = first + middle + last
    if normal:
        variants.append(normal)

    reversed_name = last + first + middle
    if reversed_name:
        variants.append(reversed_name)

    return variants


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
            .filter(CertificateRequest.control_num.like(f"{prefix}%"))
            .order_by(CertificateRequest.control_num.desc())
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
                Enrollment.year_level.desc(),
                semester_order.desc(),
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

    @staticmethod
    def _normalize_reference(reference_number: str) -> str:
        return str(reference_number or "").strip()

    @classmethod
    def _reference_match_rank(cls, payment_purpose: str, reference_number: str):
        purpose = str(payment_purpose or "").strip()
        ref = cls._normalize_reference(reference_number)
        if not purpose or not ref:
            return None

        if purpose == ref:
            return 0

        if f" {ref} - " in purpose:
            return 1

        if ref in purpose:
            return 2

        return None

    @classmethod
    def _payment_sort_key(cls, payment: Payment, reference_number: str):
        match_rank = cls._reference_match_rank(payment.purpose, reference_number)
        return (
            -(match_rank if match_rank is not None else 99),
            payment.date_of_payment or payment.paid_at or payment.created_at,
            payment.paid_at or payment.created_at,
            payment.created_at,
            payment.id or 0,
        )

    def get_by_reference(self, reference_number: str):
        ref = self._normalize_reference(reference_number)
        if not ref:
            return None

        labeled_purpose = f"% {ref} - %"

        return (
            self.query()
            .filter(
                or_(
                    Payment.purpose == ref,
                    Payment.purpose.ilike(labeled_purpose),
                    Payment.purpose.ilike(f"%{ref}%"),
                )
            )
            .order_by(
                case(
                    (Payment.purpose == ref, 0),
                    (Payment.purpose.ilike(labeled_purpose), 1),
                    else_=2,
                ),
                Payment.date_of_payment.desc(),
                Payment.paid_at.desc(),
                Payment.created_at.desc(),
                Payment.id.desc(),
            )
            .first()
        )

    def get_by_references(self, reference_numbers: list[str]) -> dict[str, Payment]:
        refs = []
        seen = set()
        for reference_number in reference_numbers or []:
            ref = self._normalize_reference(reference_number)
            if ref and ref not in seen:
                refs.append(ref)
                seen.add(ref)
        if not refs:
            return {}

        filters = []
        for ref in refs:
            filters.extend(
                [
                    Payment.purpose == ref,
                    Payment.purpose.ilike(f"% {ref} - %"),
                    Payment.purpose.ilike(f"%{ref}%"),
                ]
            )

        candidates = (
            self.query()
            .filter(or_(*filters))
            .order_by(
                Payment.date_of_payment.desc(),
                Payment.paid_at.desc(),
                Payment.created_at.desc(),
                Payment.id.desc(),
            )
            .all()
        )

        matches: dict[str, Payment] = {}
        for ref in refs:
            best_payment = None
            best_key = None
            for payment in candidates:
                match_rank = self._reference_match_rank(payment.purpose, ref)
                if match_rank is None:
                    continue
                key = self._payment_sort_key(payment, ref)
                if best_key is None or key > best_key:
                    best_key = key
                    best_payment = payment
            if best_payment:
                matches[ref] = best_payment
        return matches


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

    def get_by_student_name(self, student_name: str):
        raw_name = str(student_name or "").strip()
        tokens = _name_tokens(raw_name)
        if len(tokens) < 2:
            return None

        if "," in raw_name:
            left, right = raw_name.split(",", 1)
            left_tokens = _name_tokens(left)
            right_tokens = _name_tokens(right)
            first_token = right_tokens[0] if right_tokens else tokens[0]
            last_token = left_tokens[-1] if left_tokens else tokens[-1]
        else:
            first_token = tokens[0]
            last_token = tokens[-1]

        candidates = (
            self.query()
            .filter(
                or_(
                    Student.first_name.ilike(first_token),
                    Student.last_name.ilike(last_token),
                )
            )
            .all()
        )
        if not candidates:
            return None

        first_name_tokens = _name_tokens(first_token)
        last_name_tokens = _name_tokens(last_token)
        first_name_token = first_name_tokens[0] if first_name_tokens else ""
        last_name_token = last_name_tokens[0] if last_name_tokens else ""
        input_token_set = set(tokens)
        scored: list[tuple[int, Student]] = []

        for student in candidates:
            best_score = 0
            student_first_tokens = _name_tokens(getattr(student, "first_name", ""))
            student_last_tokens = _name_tokens(getattr(student, "last_name", ""))

            for variant in _student_name_variants(student):
                overlap = len(input_token_set & set(variant))
                if overlap < 2:
                    continue

                score = overlap * 10
                if tokens == variant[: len(tokens)]:
                    score += 20
                if first_name_token and first_name_token in student_first_tokens:
                    score += 8
                if last_name_token and last_name_token in student_last_tokens:
                    score += 8

                best_score = max(best_score, score)

            if best_score > 0:
                scored.append((best_score, student))

        if not scored:
            return None

        scored.sort(key=lambda item: (-item[0], item[1].id))
        if len(scored) > 1 and scored[0][0] == scored[1][0]:
            return None
        return scored[0][1]


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
