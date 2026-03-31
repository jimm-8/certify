from typing import Optional, Union
from datetime import datetime

from sqlalchemy import case
from sqlalchemy.orm import Session

from app.certificate_dependencies import normalize_certificate_name
from app.models.certificate_request import CertificateRequest
from app.models.campus import Campus
from app.models.college import College
from app.models.program import Program
from app.models.enrollment import Enrollment
from app.models.grade import Grade
from app.models.nstp_record import NSTPRecord
from app.models.student import Student
from app.models.course import Course
from app.models.student_course import StudentCourse
from app.models.academic_summary import AcademicSummary
from app.models.graduation_record import GraduationRecordNew
from app.models.student_id_record import StudentIdRecord
from app.models.curriculum import Curriculum
from app.repositories import (
    AcademicSummaryRepository,
    CampusRepository,
    CertificateRequestRepository,
    CollegeRepository,
    CourseRepository,
    EnrollmentRepository,
    GradeRepository,
    GraduationRecordRepository,
    NSTPRecordRepository,
    ProgramRepository,
    StudentIdRecordRepository,
    StudentRepository,
)


class CertificateDependencyEngine:
    TYPE_ALIASES = {
        "certificationauthenticationandverification": "CERTIFICATION_AUTHENTICATION_AND_VERIFICATION",
        "certificationauthenticationandverificationcav": "CERTIFICATION_AUTHENTICATION_AND_VERIFICATION",
        "certificateofgraduation": "CERTIFICATE_OF_GRADUATION",
        "certificateofenrolment": "CERTIFICATE_OF_ENROLLMENT",
        "certificateofenrollment": "CERTIFICATE_OF_ENROLLMENT",
        "certificationofearnedunits": "CERTIFICATE_OF_EARNED_UNITS",
        "certificateofearnedunits": "CERTIFICATE_OF_EARNED_UNITS",
        "certificationofenglishmedium": "CERTIFICATE_OF_ENGLISH_MEDIUM",
        "certificateofenglishmedium": "CERTIFICATE_OF_ENGLISH_MEDIUM",
        "certificationofcompletedacademicrequirements": "CERTIFICATE_OF_COMPLETED_ACAD_REQUIREMENTS",
        "certificationofhonorgraduate": "CERTIFICATE_OF_HONOR_GRADUATE",
        "certificateofcoursedescription": "CERTIFICATE_OF_COURSE_DESCRIPTION",
        "certificateofidissuance": "CERTIFICATE_OF_ID_ISSUANCE",
        "certificateofnstpserialnumber": "CERTIFICATE_OF_NSTP_SERIAL_NUMBER",
        "certificationofgwa": "CERTIFICATE_OF_GWA",
        "certificateofgwa": "CERTIFICATE_OF_GWA",
        "certificateoftransfercredentials": "CERTIFICATE_OF_TRANSFER_CREDENTIALS",
        "certificationofgrades": "CERTIFICATION_OF_GRADES",
        "certificateofgradingsystem": "CERTIFICATION_OF_GRADES",
    }

    CERTIFICATE_DEPENDENCIES = {
        "CERTIFICATION_AUTHENTICATION_AND_VERIFICATION": [
            "student",
            "program",
            "campus",
            "graduation_record",
            "certificate_request",
            "institution",
        ],
        "CERTIFICATE_OF_GRADUATION_V1": [
            "student",
            "program",
            "campus",
            "enrollment",
            "certificate_request",
        ],
        "CERTIFICATE_OF_GRADUATION_V2": [
            "student",
            "program",
            "campus",
            "graduation_record",
            "certificate_request",
        ],
        "CERTIFICATE_OF_ENROLLMENT_V1": [
            "student",
            "program",
            "campus",
            "college",
            "enrollment",
            "certificate_request",
        ],
        "CERTIFICATE_OF_ENROLLMENT_V2": [
            "student",
            "program",
            "campus",
            "college",
            "enrollments",
            "certificate_request",
        ],
        "CERTIFICATE_OF_EARNED_UNITS": [
            "student",
            "program",
            "campus",
            "student_courses",
            "enrollment",
            "academic_summary",
            "certificate_request",
        ],
        "CERTIFICATE_OF_ENGLISH_MEDIUM_V1": [
            "student",
            "program",
            "campus",
            "student_courses",
            "certificate_request",
            "enrollment",
            "enrollments",
        ],
        "CERTIFICATE_OF_ENGLISH_MEDIUM_V2": [
            "student",
            "program",
            "campus",
            "graduation_record",
            "certificate_request",
        ],
        "CERTIFICATE_OF_COMPLETED_ACAD_REQUIREMENTS": [
            "student",
            "program",
            "campus",
            "student_courses",
            "enrollment",
            "academic_summary",
            "certificate_request",
        ],
        "CERTIFICATE_OF_HONOR_GRADUATE": [
            "student",
            "program",
            "campus",
            "graduation_record",
            "enrollment",
            "certificate_request",
        ],
        "CERTIFICATE_OF_COURSE_DESCRIPTION": [
            "student",
            "program",
            "campus",
            "student_courses",
            "courses",
            "enrollments",
            "curriculum",
            "certificate_request",
        ],
        "CERTIFICATE_OF_ID_ISSUANCE_V1": [
            "student",
            "program",
            "campus",
            "student_id_record",
            "enrollment",
            "enrollments",
            "certificate_request",
        ],
        "CERTIFICATE_OF_ID_ISSUANCE_V2": [
            "student",
            "program",
            "campus",
            "student_id_record",
            "enrollment",
            "enrollments",
            "certificate_request",
        ],
        "CERTIFICATE_OF_NSTP_SERIAL_NUMBER": [
            "student",
            "program",
            "campus",
            "nstp_record",
            "certificate_request",
        ],
        "CERTIFICATE_OF_GWA": [
            "student",
            "program",
            "campus",
            "graduation_record",
            "academic_summary",
            "certificate_request",
        ],
        "CERTIFICATE_OF_TRANSFER_CREDENTIALS": [
            "student",
            "program",
            "campus",
            "college",
            "certificate_request",
        ],
        "CERTIFICATION_OF_GRADES": [
            "student",
            "program",
            "campus",
            "college",
            "student_courses",
            "enrollments",
            "certificate_request",
        ],
    }

    @staticmethod
    def resolve(
        db: Session,
        certificate_type: str,
        student_id: Optional[Union[int, str]],
        request_id: int,
    ):
        _, dependencies = CertificateDependencyEngine.resolve_with_type_key(
            db=db,
            certificate_type=certificate_type,
            student_id=student_id,
            request_id=request_id,
        )
        return dependencies

    @staticmethod
    def resolve_with_type_key(
        db: Session,
        certificate_type: str,
        student_id: Optional[Union[int, str]],
        request_id: int,
    ) -> tuple[str, dict]:

        dependencies = {}

        certificate_type_key = CertificateDependencyEngine._resolve_type_key(
            certificate_type
        )
        request = CertificateRequestRepository(db).get_by_id(request_id)
        student = CertificateDependencyEngine._resolve_student(db, student_id, request)
        sr_code = student.sr_code if student else (request.sr_code if request else None)

        student_full_name = None
        if student:
            parts = [
                getattr(student, "first_name", None),
                getattr(student, "middle_name", None),
                getattr(student, "last_name", None),
            ]
            student_full_name = " ".join([p for p in parts if p]).strip() or None

        resolved_key = CertificateDependencyEngine._resolve_versioned_key(
            db=db,
            base_key=certificate_type_key,
            sr_code=sr_code,
            student_name=student_full_name
            or (request.student_name if request else None),
        )
        dependency_list = CertificateDependencyEngine.CERTIFICATE_DEPENDENCIES.get(
            resolved_key
        )

        if not dependency_list:
            raise Exception("Unsupported certificate type")

        for dependency in dependency_list:

            if dependency == "student":
                dependencies["student"] = student

            elif dependency == "program":
                if student:
                    dependencies["program"] = (
                        ProgramRepository(db)
                        .query()
                        .filter(Program.id == student.program_id)
                        .first()
                    )
                else:
                    dependencies["program"] = None

            elif dependency == "college":
                program = dependencies.get("program")
                if program:
                    dependencies["college"] = (
                        CollegeRepository(db)
                        .query()
                        .filter(College.id == program.college_id)
                        .first()
                    )
                else:
                    dependencies["college"] = None

            elif dependency == "campus":
                program = dependencies.get("program")
                if program:
                    dependencies["campus"] = (
                        CampusRepository(db)
                        .query()
                        .filter(Campus.id == program.campus_id)
                        .first()
                    )
                else:
                    dependencies["campus"] = None

            elif dependency == "enrollment":
                dependencies["enrollment"] = (
                    CertificateDependencyEngine._get_latest_enrollment(db, sr_code)
                )

            elif dependency == "enrollments":
                dependencies["enrollments"] = (
                    EnrollmentRepository(db).for_student(sr_code).all()
                    if sr_code
                    else []
                )

            elif dependency == "graduation_record":
                dependencies["graduation_record"] = (
                    CertificateDependencyEngine._get_graduation_record(
                        db,
                        sr_code,
                        student_name=student_full_name
                        or (request.student_name if request else None),
                    )
                )

            elif dependency == "academic_summary":
                dependencies["academic_summary"] = (
                    CertificateDependencyEngine._get_academic_summary(db, sr_code)
                )

            elif dependency == "student_courses":
                dependencies["student_courses"] = (
                    CertificateDependencyEngine._get_student_courses(db, sr_code)
                )

            elif dependency == "curriculum":
                program = dependencies.get("program")
                dependencies["curriculum"] = (
                    db.query(Curriculum)
                    .filter(Curriculum.program_id == program.id)
                    .order_by(Curriculum.academic_year.desc())
                    .first()
                    if program
                    else None
                )

            elif dependency == "courses":
                dependencies["courses"] = CourseRepository(db).query().all()

            elif dependency == "nstp_record":
                dependencies["nstp_record"] = (
                    CertificateDependencyEngine._get_nstp_record(db, sr_code)
                )

            elif dependency == "student_id_record":
                dependencies["student_id_record"] = (
                    StudentIdRecordRepository(db).get_by_sr_code(sr_code)
                    if sr_code
                    else None
                )

            elif dependency == "certificate_request":
                dependencies["certificate_request"] = request

            elif dependency == "institution":
                dependencies["institution"] = None

        return resolved_key, dependencies

    @staticmethod
    def _resolve_type_key(certificate_type: str) -> str:
        if certificate_type in CertificateDependencyEngine.CERTIFICATE_DEPENDENCIES:
            return certificate_type
        normalized = normalize_certificate_name(certificate_type)
        if normalized in CertificateDependencyEngine.TYPE_ALIASES:
            return CertificateDependencyEngine.TYPE_ALIASES[normalized]
        if "gwa" in normalized:
            return "CERTIFICATE_OF_GWA"
        if "englishmedium" in normalized:
            return "CERTIFICATE_OF_ENGLISH_MEDIUM"
        return certificate_type

    @staticmethod
    def _resolve_versioned_key(
        db: Session,
        base_key: str,
        sr_code: Optional[str],
        student_name: Optional[str] = None,
    ) -> str:
        if base_key in CertificateDependencyEngine.CERTIFICATE_DEPENDENCIES:
            return base_key

        has_v1 = (
            f"{base_key}_V1" in CertificateDependencyEngine.CERTIFICATE_DEPENDENCIES
        )
        has_v2 = (
            f"{base_key}_V2" in CertificateDependencyEngine.CERTIFICATE_DEPENDENCIES
        )
        if not (has_v1 or has_v2):
            return base_key

        graduation_record = CertificateDependencyEngine._get_graduation_record(
            db, sr_code, student_name=student_name
        )
        is_candidate = CertificateDependencyEngine._is_candidate_record(
            graduation_record
        )

        if base_key == "CERTIFICATE_OF_GRADUATION":
            return f"{base_key}_V1" if is_candidate else f"{base_key}_V2"

        if base_key == "CERTIFICATE_OF_ENROLLMENT":
            return f"{base_key}_V1" if is_candidate else f"{base_key}_V2"

        if base_key == "CERTIFICATE_OF_ENGLISH_MEDIUM":
            return f"{base_key}_V1" if is_candidate else f"{base_key}_V2"

        if base_key == "CERTIFICATE_OF_ID_ISSUANCE":
            return f"{base_key}_V1" if is_candidate else f"{base_key}_V2"

        if has_v2:
            return f"{base_key}_V2"
        if has_v1:
            return f"{base_key}_V1"
        return base_key

    @staticmethod
    def _current_academic_term(now: Optional[datetime] = None) -> tuple[str, str]:
        now = now or datetime.now()
        year = now.year
        month = now.month

        if month >= 8:
            semester = "1st"
            academic_year = f"{year}-{year + 1}"
        elif month <= 5:
            semester = "2nd"
            academic_year = f"{year - 1}-{year}"
        else:
            semester = "Summer"
            academic_year = f"{year - 1}-{year}"
        return semester, academic_year

    @staticmethod
    def _has_earned_units(db: Session, sr_code: Optional[str]) -> bool:
        if not sr_code:
            return False
        has_grade = (
            GradeRepository(db).query().filter(Grade.student_id == sr_code).first()
        )
        return has_grade is not None

    @staticmethod
    def _resolve_student(
        db: Session,
        student_ref: Optional[Union[int, str]],
        request: Optional[CertificateRequest],
    ) -> Optional[Student]:
        if isinstance(student_ref, int):
            return (
                StudentRepository(db).query().filter(Student.id == student_ref).first()
            )
        if isinstance(student_ref, str) and student_ref:
            return StudentRepository(db).get_by_sr_code(student_ref)
        if request and request.sr_code:
            return StudentRepository(db).get_by_sr_code(request.sr_code)
        return None

    @staticmethod
    def _get_latest_enrollment(db: Session, sr_code: Optional[str]):
        if not sr_code:
            return None
        semester_order = case(
            (Enrollment.semester == "1st", 1),
            (Enrollment.semester == "2nd", 2),
            else_=9,
        )
        return EnrollmentRepository(db).latest_for_student(sr_code, semester_order)

    @staticmethod
    def _get_graduation_record(
        db: Session, sr_code: Optional[str], student_name: Optional[str] = None
    ):
        if sr_code:
            record = GraduationRecordRepository(db).get_by_sr_code(sr_code)
            if record:
                return record
        if student_name:
            return GraduationRecordRepository(db).get_by_student_name(student_name)
        return None

    @staticmethod
    def _is_candidate_record(record) -> bool:
        if not record:
            return False
        try:
            is_graduated = bool(getattr(record, "is_graduated", False))
        except Exception:
            is_graduated = False
        status = str(getattr(record, "status", "") or "").strip().lower()
        return (not is_graduated) and status == "candidate"

    @staticmethod
    def _get_academic_summary(db: Session, sr_code: Optional[str]) -> dict:
        if not sr_code:
            return {}
        summary = (
            AcademicSummaryRepository(db)
            .query()
            .filter(AcademicSummary.sr_code == sr_code)
            .order_by(
                AcademicSummary.academic_year.desc(), AcademicSummary.semester.desc()
            )
            .first()
        )
        if summary:
            return {
                "gwa": summary.gwa,
                "total_units_earned": summary.total_units_earned,
                "cumulative_units_earned": summary.cumulative_units_earned,
                "academic_year": summary.academic_year,
                "semester": summary.semester,
                "status": summary.status,
            }

        return {}

    @staticmethod
    def _get_student_courses(
        db: Session, sr_code: Optional[str]
    ) -> list[dict[str, str]]:
        if not sr_code:
            return []
        rows = (
            CourseRepository(db)
            .query_with(
                Course.course_code,
                Course.course_title,
                Course.units,
                Course.course_description,
                Grade.grade,
                Enrollment.academic_year,
                Enrollment.semester,
            )
            .join(Grade, Grade.course_id == Course.id)
            .join(Enrollment, Enrollment.id == Grade.enrollment_id)
            .filter(Grade.student_id == sr_code)
            .order_by(Course.course_code.asc())
            .all()
        )
        return [
            {
                "course_code": str(code or ""),
                "course_title": str(title or ""),
                "units": str(units or ""),
                "course_description": str(description or ""),
                "grade": str(grade or ""),
                "academic_year": str(academic_year or ""),
                "semester": str(semester or ""),
            }
            for code, title, units, description, grade, academic_year, semester in rows
        ]

    @staticmethod
    def _get_nstp_record(db: Session, sr_code: Optional[str]):
        if not sr_code:
            return None
        record = NSTPRecordRepository(db).get_by_student_id(sr_code)
        return record
