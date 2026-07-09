from __future__ import annotations

import random
import sys
from datetime import datetime, timedelta

from sqlalchemy.orm import Session

from app.database import Base, SessionLocal, engine
from app.models.certificate_dependency_data import (
    CAVRecord,
    CompletedAcademicRequirementsRecord,
    CourseDescriptionRecord,
    EarnedUnitsRecord,
    EnrollmentRecord,
    EnglishMediumRecord,
    GWARecord,
    GradesRecord,
    GraduationRecord,
    HonorGraduateRecord,
    IDIssuanceRecord,
    NSTPSerialRecord,
    TransferCredentialsRecord,
)
from app.models.student import Student


SEMESTERS = ["1st", "2nd", "Summer"]
LATIN_HONORS = ["Cum Laude", "Magna Cum Laude", "Summa Cum Laude"]
REQUESTORS = [
    "Juan Dela Cruz",
    "Maria Santos",
    "Jose Reyes",
    "Ana Garcia",
    "Carlo Mendoza",
]
PURPOSES = [
    "Employment",
    "Further Studies",
    "Scholarship",
    "Board Exam",
    "Personal Record",
]
NSTP_COMPONENTS = ["CWTS", "ROTC", "LTS"]
AUTHORIZED_OFFICIAL = "Registrar Head"
CAMPUS_ADDRESS = "Golden Country Homes, Alangilan, Batangas City"
INSTITUTION_NAME = "Batangas State University"
COLLEGE_FALLBACK = "College of Engineering"


def student_full_name(student: Student) -> str:
    parts = [student.first_name, student.middle_name, student.last_name]
    return " ".join([part for part in parts if part]).strip()


def random_date(start_days_ago: int = 900) -> datetime:
    return datetime.now() - timedelta(days=random.randint(1, start_days_ago))


def format_date(dt: datetime) -> str:
    return dt.strftime("%B %d, %Y")


def random_academic_year() -> str:
    start = random.randint(2018, datetime.now().year)
    return f"{start}-{start + 1}"


def random_gwa() -> float:
    return round(random.uniform(1.10, 2.50), 2)


def random_units() -> float:
    return float(random.choice([1, 2, 3, 4, 5, 6]))


def random_grade() -> str:
    return random.choice(["1.00", "1.25", "1.50", "1.75", "2.00", "2.25", "2.50"])


def random_course_code() -> str:
    return random.choice(["MATH101", "ENG201", "CS301", "PHY110", "CHEM120", "HIST100"])


def random_course_title() -> str:
    return random.choice(
        [
            "Calculus I",
            "Technical Writing",
            "Data Structures",
            "General Physics",
            "General Chemistry",
            "Philippine History",
        ]
    )


def seed_for_student(db: Session, student: Student, seq: int) -> None:
    student_name = student_full_name(student)
    sr_code = student.sr_code
    program_name = student.program.name if student.program else "Unknown Program"
    major_name = student.major or "General"
    year_level = student.year_level or random.choice(
        ["1st Year", "2nd Year", "3rd Year", "4th Year"]
    )

    date_issued = format_date(random_date())
    graduation_date = format_date(random_date(1800))
    semester = random.choice(SEMESTERS)
    academic_year = random_academic_year()
    requestor = random.choice(REQUESTORS)
    board_resolution = f"BR-{datetime.now().year}-{seq:04d}"

    if not db.query(CAVRecord).filter(CAVRecord.sr_code == sr_code).first():
        db.add(
            CAVRecord(
                sr_code=sr_code,
                student_name=student_name,
                cav_number=f"CAV-{datetime.now().year}-{seq:05d}",
                series=str(datetime.now().year),
                date_of_issuance=date_issued,
                degree=program_name,
                date_of_graduation=graduation_date,
                institution_name=INSTITUTION_NAME,
                address=f"Address #{seq}, Batangas",
                requestor_name=requestor,
                authorized_official_name=AUTHORIZED_OFFICIAL,
                processed_and_reviewed_by="Registrar Staff",
                or_number=f"OR-{datetime.now().year}-{seq:05d}",
                control_num=f"OR-{datetime.now().year}-{seq:05d}",
                date_issued=date_issued,
                amount=float(random.choice([50, 75, 100, 150])),
            )
        )

    if (
        not db.query(GraduationRecord)
        .filter(GraduationRecord.sr_code == sr_code)
        .first()
    ):
        is_graduated = random.choice([True, False])
        db.add(
            GraduationRecord(
                sr_code=sr_code,
                student_name=student_name,
                is_graduated=is_graduated,
                program=program_name,
                date_of_graduation=graduation_date if is_graduated else None,
                board_resolution_number=board_resolution if is_graduated else None,
                requestor_name=requestor,
                semester=None if is_graduated else semester,
                academic_year=None if is_graduated else academic_year,
                date_of_issuance=date_issued,
                authorized_official_name=AUTHORIZED_OFFICIAL,
            )
        )

    if (
        not db.query(EnrollmentRecord)
        .filter(EnrollmentRecord.sr_code == sr_code)
        .first()
    ):
        is_current = random.choice([True, False])
        db.add(
            EnrollmentRecord(
                sr_code=sr_code,
                student_name=student_name,
                is_current=is_current,
                year_level=year_level,
                college_name=COLLEGE_FALLBACK,
                semester=semester if is_current else None,
                academic_year=academic_year if is_current else None,
                semester_start=random.choice(SEMESTERS) if not is_current else None,
                academic_year_start=random_academic_year() if not is_current else None,
                semester_end=random.choice(SEMESTERS) if not is_current else None,
                academic_year_end=random_academic_year() if not is_current else None,
                date_of_issuance=date_issued,
                requestor_name=requestor,
                purpose_of_request=random.choice(PURPOSES),
                authorized_official_name=AUTHORIZED_OFFICIAL,
            )
        )

    if (
        not db.query(EarnedUnitsRecord)
        .filter(EarnedUnitsRecord.sr_code == sr_code)
        .first()
    ):
        db.add(
            EarnedUnitsRecord(
                sr_code=sr_code,
                student_name=student_name,
                credits=random.uniform(12, 180),
                program=program_name,
                semester_current=semester,
                academic_year=academic_year,
                requestor_name=requestor,
                date_of_issuance=date_issued,
                authorized_official_name=AUTHORIZED_OFFICIAL,
            )
        )

    if (
        not db.query(EnglishMediumRecord)
        .filter(EnglishMediumRecord.sr_code == sr_code)
        .first()
    ):
        has_graduated = random.choice([True, False])
        db.add(
            EnglishMediumRecord(
                sr_code=sr_code,
                student_name=student_name,
                has_graduated=has_graduated,
                campus_address=CAMPUS_ADDRESS,
                program=program_name,
                date_of_graduation=graduation_date if has_graduated else None,
                regulation="English is the medium of instruction",
                requestor_name=requestor,
                date_of_issuance=date_issued,
                authorized_official_name=AUTHORIZED_OFFICIAL,
            )
        )

    if (
        not db.query(CompletedAcademicRequirementsRecord)
        .filter(CompletedAcademicRequirementsRecord.sr_code == sr_code)
        .first()
    ):
        db.add(
            CompletedAcademicRequirementsRecord(
                sr_code=sr_code,
                student_name=student_name,
                credits=random.uniform(12, 180),
                program=program_name,
                semester_current=semester,
                academic_year=academic_year,
                requestor_name=requestor,
                date_of_issuance=date_issued,
                authorized_official_name=AUTHORIZED_OFFICIAL,
            )
        )

    if (
        not db.query(HonorGraduateRecord)
        .filter(HonorGraduateRecord.sr_code == sr_code)
        .first()
    ):
        db.add(
            HonorGraduateRecord(
                sr_code=sr_code,
                student_name=student_name,
                address=f"Address #{seq}, Batangas",
                latin_honor=random.choice(LATIN_HONORS),
                program=program_name,
                date_of_graduation=graduation_date,
                board_resolution_number=board_resolution,
                academic_year_when_graduated=academic_year,
                requestor_name=requestor,
                date_of_issuance=date_issued,
                purpose_of_request=random.choice(PURPOSES),
                authorized_official_name=AUTHORIZED_OFFICIAL,
            )
        )

    if (
        not db.query(CourseDescriptionRecord)
        .filter(CourseDescriptionRecord.sr_code == sr_code)
        .first()
    ):
        db.add(
            CourseDescriptionRecord(
                sr_code=sr_code,
                student_name=student_name,
                program=program_name,
                semester_current=semester,
                academic_year=academic_year,
                course_code=random_course_code(),
                credits=random_units(),
                course_description=random_course_title(),
                requestor_name=requestor,
                date_of_issuance=date_issued,
                authorized_official_name=AUTHORIZED_OFFICIAL,
            )
        )

    if (
        not db.query(IDIssuanceRecord)
        .filter(IDIssuanceRecord.sr_code == sr_code)
        .first()
    ):
        currently_enrolled = random.choice([True, False])
        db.add(
            IDIssuanceRecord(
                sr_code=sr_code,
                student_name=student_name,
                is_currently_enrolled=currently_enrolled,
                year_attended_start=(
                    str(random.randint(2018, 2023)) if not currently_enrolled else None
                ),
                year_attended_end=(
                    str(random.randint(2023, 2026)) if not currently_enrolled else None
                ),
                semester_current=semester if currently_enrolled else None,
                academic_year=academic_year if currently_enrolled else None,
                id_number=f"ID-{seq:06d}",
                date_of_issuance=date_issued,
                requestor_name=requestor,
                authorized_official_name=AUTHORIZED_OFFICIAL,
            )
        )

    if (
        not db.query(NSTPSerialRecord)
        .filter(NSTPSerialRecord.sr_code == sr_code)
        .first()
    ):
        db.add(
            NSTPSerialRecord(
                sr_code=sr_code,
                student_name=student_name,
                nstp_component=random.choice(NSTP_COMPONENTS),
                nstp_serial_number=f"NSTP-{datetime.now().year}-{seq:05d}",
                date_of_issuance=date_issued,
                requestor_name=requestor,
                authorized_official_name=AUTHORIZED_OFFICIAL,
            )
        )

    if not db.query(GWARecord).filter(GWARecord.sr_code == sr_code).first():
        db.add(
            GWARecord(
                sr_code=sr_code,
                student_name=student_name,
                program=program_name,
                major=major_name,
                board_resolution_number=board_resolution,
                gwa=random_gwa(),
                date_of_issuance=date_issued,
                requestor_name=requestor,
                authorized_official_name=AUTHORIZED_OFFICIAL,
            )
        )

    if (
        not db.query(TransferCredentialsRecord)
        .filter(TransferCredentialsRecord.sr_code == sr_code)
        .first()
    ):
        db.add(
            TransferCredentialsRecord(
                sr_code=sr_code,
                student_name=student_name,
                program=program_name,
                date_of_issuance=date_issued,
                requestor_name=requestor,
                authorized_official_name=AUTHORIZED_OFFICIAL,
            )
        )

    if not db.query(GradesRecord).filter(GradesRecord.sr_code == sr_code).first():
        db.add(
            GradesRecord(
                sr_code=sr_code,
                student_name=student_name,
                program_and_college=f"{program_name} - {COLLEGE_FALLBACK}",
                semester_and_academic_year=f"{semester} Semester, AY {academic_year}",
                course_code=random_course_code(),
                course_title=random_course_title(),
                units=random_units(),
                grade=random_grade(),
                date_of_issuance=date_issued,
                requestor_name=requestor,
                authorized_official_name=AUTHORIZED_OFFICIAL,
            )
        )


def seed_certificate_dependency_data(limit: int = 50) -> None:
    limit = max(1, min(limit, 50))
    db = SessionLocal()

    try:
        Base.metadata.create_all(bind=engine)

        students = db.query(Student).order_by(Student.id.asc()).limit(limit).all()
        if not students:
            print(
                "No students found. Run academic_seeder.py then student_seeder.py first."
            )
            return

        print(f"Seeding certificate dependency tables for {len(students)} students...")

        for idx, student in enumerate(students, start=1):
            seed_for_student(db, student, idx)

        db.commit()
        print("Certificate dependency data seeding completed.")
    except Exception:
        db.rollback()
        raise
    finally:
        db.close()


if __name__ == "__main__":
    arg_limit = 50
    if len(sys.argv) > 1:
        try:
            arg_limit = int(sys.argv[1])
        except ValueError:
            arg_limit = 50

    print("=" * 72)
    print("Seeding certificate dependency test data")
    print("=" * 72)
    seed_certificate_dependency_data(arg_limit)
    print("=" * 72)
    print("Done.")
    print("=" * 72)
