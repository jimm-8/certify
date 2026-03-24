from typing import Optional, Union
from datetime import datetime

from sqlalchemy import case, func
from sqlalchemy.orm import Session

from app.certificate_dependencies import normalize_certificate_name
from app.models.certificate_request import CertificateRequest
from app.models.certificate_dependency_data import (
    EarnedUnitsRecord,
    GWARecord,
    GraduationRecord,
    IDIssuanceRecord,
    NSTPSerialRecord,
)
from app.models.campus import Campus
from app.models.college import College
from app.models.program import Program
from app.models.registrar_simulation import CourseCatalog, Enrollment, Grade, Graduate, NSTPRecord, SemesterGWA
from app.models.student import Student


class CertificateDependencyEngine:
    TYPE_ALIASES = {
        "certificationauthenticationandverificationcav": "CERTIFICATION_AUTHENTICATION_AND_VERIFICATION",
        "certificateofgraduation": "CERTIFICATE_OF_GRADUATION",
        "certificateofenrolment": "CERTIFICATE_OF_ENROLLMENT",
        "certificateofenrollment": "CERTIFICATE_OF_ENROLLMENT",
        "certificationofearnedunits": "CERTIFICATE_OF_EARNED_UNITS",
        "certificateofearnedunits": "CERTIFICATE_OF_EARNED_UNITS",
        "certificationofenglishmedium": "CERTIFICATE_OF_ENGLISH_MEDIUM",
        "certificationofcompletedacademicrequirements": "CERTIFICATE_OF_COMPLETED_ACAD_REQUIREMENTS",
        "certificationofhonorgraduate": "CERTIFICATE_OF_HONOR_GRADUATE",
        "certificateofcoursedescription": "CERTIFICATE_OF_COURSE_DESCRIPTION",
        "certificateofidissuance": "CERTIFICATE_OF_ID_ISSUANCE",
        "certificateofnstpserialnumber": "CERTIFICATE_OF_NSTP_SERIAL_NUMBER",
        "certificationofgwa": "CERTIFICATE_OF_GWA",
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
            "certificate_request",
        ],
        "CERTIFICATE_OF_ENGLISH_MEDIUM_V1": [
            "student",
            "program",
            "campus",
            "student_courses",
            "certificate_request",
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
            "certificate_request",
        ],
        "CERTIFICATE_OF_ID_ISSUANCE_V1": [
            "student",
            "program",
            "campus",
            "student_id_record",
            "enrollment",
            "certificate_request",
        ],
        "CERTIFICATE_OF_ID_ISSUANCE_V2": [
            "student",
            "program",
            "campus",
            "student_id_record",
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

        certificate_type_key = CertificateDependencyEngine._resolve_type_key(certificate_type)
        request = db.query(CertificateRequest).filter(CertificateRequest.id == request_id).first()
        student = CertificateDependencyEngine._resolve_student(db, student_id, request)
        sr_code = student.sr_code if student else (request.sr_code if request else None)

        resolved_key = CertificateDependencyEngine._resolve_versioned_key(
            db=db,
            base_key=certificate_type_key,
            sr_code=sr_code,
        )
        dependency_list = CertificateDependencyEngine.CERTIFICATE_DEPENDENCIES.get(resolved_key)

        if not dependency_list:
            raise Exception("Unsupported certificate type")

        for dependency in dependency_list:

            if dependency == "student":
                dependencies["student"] = student

            elif dependency == "program":
                if student:
                    dependencies["program"] = (
                        db.query(Program)
                        .filter(Program.id == student.program_id)
                        .first()
                    )
                else:
                    dependencies["program"] = None

            elif dependency == "college":
                program = dependencies.get("program")
                if program:
                    dependencies["college"] = (
                        db.query(College)
                        .filter(College.id == program.college_id)
                        .first()
                    )
                else:
                    dependencies["college"] = None

            elif dependency == "campus":
                program = dependencies.get("program")
                if program:
                    dependencies["campus"] = (
                        db.query(Campus)
                        .filter(Campus.id == program.campus_id)
                        .first()
                    )
                else:
                    dependencies["campus"] = None

            elif dependency == "enrollment":
                dependencies["enrollment"] = CertificateDependencyEngine._get_latest_enrollment(db, sr_code)

            elif dependency == "enrollments":
                dependencies["enrollments"] = (
                    db.query(Enrollment).filter(Enrollment.student_id == sr_code).all()
                    if sr_code
                    else []
                )

            elif dependency == "graduation_record":
                dependencies["graduation_record"] = CertificateDependencyEngine._get_graduation_record(db, sr_code)

            elif dependency == "academic_summary":
                dependencies["academic_summary"] = CertificateDependencyEngine._get_academic_summary(db, sr_code)

            elif dependency == "student_courses":
                dependencies["student_courses"] = CertificateDependencyEngine._get_student_courses(db, sr_code)

            elif dependency == "courses":
                dependencies["courses"] = db.query(CourseCatalog).all()

            elif dependency == "nstp_record":
                dependencies["nstp_record"] = CertificateDependencyEngine._get_nstp_record(db, sr_code)

            elif dependency == "student_id_record":
                dependencies["student_id_record"] = (
                    db.query(IDIssuanceRecord)
                    .filter(IDIssuanceRecord.sr_code == sr_code)
                    .first()
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
        return CertificateDependencyEngine.TYPE_ALIASES.get(normalized, certificate_type)

    @staticmethod
    def _resolve_versioned_key(
        db: Session,
        base_key: str,
        sr_code: Optional[str],
    ) -> str:
        if base_key in CertificateDependencyEngine.CERTIFICATE_DEPENDENCIES:
            return base_key

        has_v1 = f"{base_key}_V1" in CertificateDependencyEngine.CERTIFICATE_DEPENDENCIES
        has_v2 = f"{base_key}_V2" in CertificateDependencyEngine.CERTIFICATE_DEPENDENCIES
        if not (has_v1 or has_v2):
            return base_key

        graduation_record = CertificateDependencyEngine._get_graduation_record(db, sr_code)
        is_graduated = graduation_record is not None

        if base_key == "CERTIFICATE_OF_GRADUATION":
            return f"{base_key}_V2" if is_graduated else f"{base_key}_V1"

        if base_key == "CERTIFICATE_OF_ENROLLMENT":
            enrollment = CertificateDependencyEngine._get_latest_enrollment(db, sr_code)
            current_semester, current_ay = CertificateDependencyEngine._current_academic_term()
            is_current = (
                enrollment is not None
                and str(enrollment.semester) == current_semester
                and str(enrollment.academic_year) == current_ay
            )
            return f"{base_key}_V1" if is_current else f"{base_key}_V2"

        if base_key == "CERTIFICATE_OF_ENGLISH_MEDIUM":
            has_earned_units = CertificateDependencyEngine._has_earned_units(db, sr_code)
            if is_graduated:
                return f"{base_key}_V2"
            if has_earned_units:
                return f"{base_key}_V1"
            return f"{base_key}_V1"

        if base_key == "CERTIFICATE_OF_ID_ISSUANCE":
            enrollment = CertificateDependencyEngine._get_latest_enrollment(db, sr_code)
            current_semester, current_ay = CertificateDependencyEngine._current_academic_term()
            is_current = (
                enrollment is not None
                and str(enrollment.semester) == current_semester
                and str(enrollment.academic_year) == current_ay
            )
            return f"{base_key}_V1" if (is_current and not is_graduated) else f"{base_key}_V2"

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
        has_grade = db.query(Grade.id).filter(Grade.student_id == sr_code).first()
        if has_grade:
            return True
        fallback = (
            db.query(EarnedUnitsRecord.id)
            .filter(EarnedUnitsRecord.sr_code == sr_code)
            .first()
        )
        return fallback is not None

    @staticmethod
    def _resolve_student(
        db: Session,
        student_ref: Optional[Union[int, str]],
        request: Optional[CertificateRequest],
    ) -> Optional[Student]:
        if isinstance(student_ref, int):
            return db.query(Student).filter(Student.id == student_ref).first()
        if isinstance(student_ref, str) and student_ref:
            return db.query(Student).filter(Student.sr_code == student_ref).first()
        if request and request.sr_code:
            return db.query(Student).filter(Student.sr_code == request.sr_code).first()
        return None

    @staticmethod
    def _get_latest_enrollment(db: Session, sr_code: Optional[str]):
        if not sr_code:
            return None
        semester_order = case((Enrollment.semester == "1st", 1), (Enrollment.semester == "2nd", 2), else_=9)
        return (
            db.query(Enrollment)
            .filter(Enrollment.student_id == sr_code)
            .order_by(Enrollment.academic_year.desc(), semester_order.desc(), Enrollment.year_level.desc())
            .first()
        )

    @staticmethod
    def _get_graduation_record(db: Session, sr_code: Optional[str]):
        if not sr_code:
            return None
        graduate = db.query(Graduate).filter(Graduate.student_id == sr_code).first()
        if graduate:
            return graduate
        return db.query(GraduationRecord).filter(GraduationRecord.sr_code == sr_code).first()

    @staticmethod
    def _get_academic_summary(db: Session, sr_code: Optional[str]) -> dict:
        if not sr_code:
            return {}
        avg_gwa = db.query(func.avg(SemesterGWA.gwa)).filter(SemesterGWA.student_id == sr_code).scalar()
        if avg_gwa is None:
            fallback = (
                db.query(GWARecord)
                .filter(GWARecord.sr_code == sr_code)
                .order_by(GWARecord.id.desc())
                .first()
            )
            if fallback and fallback.gwa is not None:
                avg_gwa = fallback.gwa
        if avg_gwa is None:
            return {}
        return {"gwa": float(avg_gwa)}

    @staticmethod
    def _get_student_courses(db: Session, sr_code: Optional[str]) -> list[dict[str, str]]:
        if not sr_code:
            return []
        rows = (
            db.query(
                CourseCatalog.course_code,
                CourseCatalog.course_title,
                CourseCatalog.units,
                Grade.grade,
            )
            .join(Grade, Grade.course_id == CourseCatalog.id)
            .filter(Grade.student_id == sr_code)
            .order_by(CourseCatalog.course_code.asc())
            .all()
        )
        return [
            {
                "course_code": str(code or ""),
                "course_title": str(title or ""),
                "units": str(units or ""),
                "grade": str(grade or ""),
            }
            for code, title, units, grade in rows
        ]

    @staticmethod
    def _get_nstp_record(db: Session, sr_code: Optional[str]):
        if not sr_code:
            return None
        record = db.query(NSTPRecord).filter(NSTPRecord.student_id == sr_code).first()
        if record:
            return record
        return db.query(NSTPSerialRecord).filter(NSTPSerialRecord.sr_code == sr_code).first()
