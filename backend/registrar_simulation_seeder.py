from __future__ import annotations

import random
import sys
import hashlib
from datetime import date

from sqlalchemy.orm import Session, joinedload

from app.database import Base, SessionLocal, engine
from app.models.program import Program
from app.models.registrar_simulation import (
    CourseCatalog,
    Enrollment,
    EnrollmentCourse,
    Grade,
    Graduate,
    NSTPRecord,
    SemesterGWA,
    StudentRecord,
)
from app.models.student import Student


CURRENT_YEAR = date.today().year
MIN_STUDENTS = 200
MAX_STUDENTS = 500
DEFAULT_STUDENTS = 300
SEMESTERS = ["1st", "2nd"]
STATUS_VALUES = ["active", "graduated", "dropped"]
NSTP_COMPONENTS = ["ROTC", "CWTS", "LTS"]
GRADE_VALUES = [1.00, 1.25, 1.50, 1.75, 2.00, 2.25, 2.50, 2.75, 3.00, 5.00]
GRADE_WEIGHTS = [0.04, 0.08, 0.18, 0.20, 0.20, 0.15, 0.10, 0.04, 0.008, 0.002]

FIRST_NAMES = [
    "Joshua",
    "Maria",
    "John",
    "Angela",
    "Carlo",
    "Patricia",
    "Miguel",
    "Alyssa",
    "Rafael",
    "Nicole",
    "Mark",
    "Franz",
    "Katrina",
    "Elaine",
    "Jerome",
]
MIDDLE_NAMES = ["Santos", "Reyes", "Garcia", "Flores", "Mendoza", "Torres", "Aquino", "Navarro"]
LAST_NAMES = ["Padilla", "Dela Cruz", "Bautista", "Ramos", "Lopez", "Domingo", "Salazar", "Castillo"]
STREETS = ["P. Burgos St.", "Mabini Ave.", "Rizal St.", "Quezon Ave.", "Bonifacio Rd."]
TOWNS = ["Batangas City", "Lipa City", "Nasugbu", "Lemery", "Rosario", "Balayan"]


def clamp_target(value: int) -> int:
    return max(MIN_STUDENTS, min(MAX_STUDENTS, value))


def program_duration(program_name: str) -> int:
    if "Architecture" in (program_name or ""):
        return 5
    return 4


def make_sr_code(admission_year: int, used_codes: set[str]) -> str:
    prefix = str(admission_year)[-2:]
    while True:
        candidate = f"{prefix}-{random.randint(0, 99999):05d}"
        if candidate not in used_codes:
            used_codes.add(candidate)
            return candidate


def weighted_grade() -> float:
    return random.choices(GRADE_VALUES, weights=GRADE_WEIGHTS, k=1)[0]


def random_birthdate(year_admitted: int) -> date:
    start_year = year_admitted - random.randint(16, 20)
    month = random.randint(1, 12)
    day = random.randint(1, 28)
    return date(start_year, month, day)


def random_address() -> str:
    return f"{random.randint(1, 999)} {random.choice(STREETS)}, {random.choice(TOWNS)}, Batangas"


def student_full_name(first_name: str, middle_name: str | None, last_name: str) -> str:
    parts = [first_name, middle_name, last_name]
    return " ".join([p for p in parts if p]).strip()


def curriculum_course_title(program_code: str, year_level: int, semester: str, slot: int) -> str:
    term = "Core" if slot <= 4 else "Specialized"
    return f"{program_code} {year_level}{semester[0]}{slot} {term} Course"


def curriculum_course_desc(program_name: str, year_level: int, semester: str, slot: int) -> str:
    return (
        f"{program_name} year {year_level} {semester} semester course {slot} covering "
        f"foundational and applied competencies."
    )


def stable_program_token(program_name: str) -> str:
    return hashlib.md5((program_name or "").encode("utf-8")).hexdigest()[:4].upper()


def ensure_course_catalog(db: Session, programs: list[Program]) -> None:
    if db.query(CourseCatalog.id).first():
        return

    print("Seeding course catalog curriculum...")
    unique_programs: dict[str, str] = {}
    for program in programs:
        if not program.name:
            continue
        unique_programs.setdefault(program.name, (program.code or "GEN").upper())

    for p_name, p_code in unique_programs.items():
        duration = program_duration(p_name)
        token = stable_program_token(p_name)

        for year_level in range(1, duration + 1):
            for semester in SEMESTERS:
                for slot in range(1, 9):
                    # Include a stable program token to avoid duplicate codes across repeated program codes.
                    course_code = f"{p_code}{token}{year_level}{semester[0]}{slot:02d}"
                    db.add(
                        CourseCatalog(
                            course_code=course_code,
                            course_title=curriculum_course_title(p_code, year_level, semester, slot),
                            course_description=curriculum_course_desc(p_name, year_level, semester, slot),
                            units=3,
                            year_level=year_level,
                            semester_offered=semester,
                            program=p_name,
                        )
                    )

    db.commit()
    print("Course catalog seeded.")


def ensure_students(db: Session, target_count: int) -> list[Student]:
    students = db.query(Student).options(joinedload(Student.program).joinedload(Program.college)).all()
    if len(students) >= target_count:
        return students[:target_count]

    programs = db.query(Program).options(joinedload(Program.college)).all()
    if not programs:
        raise RuntimeError("No programs available. Run academic_seeder.py first.")

    print(f"Creating additional students to reach {target_count} total...")
    existing_codes = {code for (code,) in db.query(Student.sr_code).all()}
    needed = target_count - len(students)

    for _ in range(needed):
        program = random.choice(programs)
        admitted = random.randint(2018, 2024)
        sr_code = make_sr_code(admitted, existing_codes)
        first = random.choice(FIRST_NAMES)
        middle = random.choice(MIDDLE_NAMES)
        last = random.choice(LAST_NAMES)
        year_level_now = min(program_duration(program.name), max(1, CURRENT_YEAR - admitted + 1))

        db.add(
            Student(
                sr_code=sr_code,
                first_name=first,
                middle_name=middle,
                last_name=last,
                program_id=program.id,
                major=program.major,
                year_level=f"{year_level_now}th Year",
                email=f"{first.lower()}.{last.lower()}{random.randint(10,99)}@student.edu.ph",
                contact_number=f"09{random.randint(100000000, 999999999)}",
            )
        )

    db.commit()
    return db.query(Student).options(joinedload(Student.program).joinedload(Program.college)).limit(target_count).all()


def ensure_student_record(db: Session, student: Student) -> StudentRecord:
    existing = db.query(StudentRecord).filter(StudentRecord.sr_code == student.sr_code).first()
    if existing:
        return existing

    program_name = student.program.name if student.program else "Unknown Program"
    college_name = student.program.college.name if (student.program and student.program.college) else "Unknown College"
    admitted = int(student.sr_code.split("-")[0])
    admitted += 2000 if admitted < 100 else 0
    admitted = min(max(admitted, 2018), 2024)
    expected_grad = admitted + program_duration(program_name)
    status = "graduated" if expected_grad <= CURRENT_YEAR and random.random() < 0.8 else random.choice(["active", "dropped"])

    record = StudentRecord(
        student_ref_id=student.id,
        sr_code=student.sr_code,
        first_name=student.first_name,
        middle_name=student.middle_name,
        last_name=student.last_name,
        sex=random.choice(["Male", "Female"]),
        birthdate=random_birthdate(admitted),
        address=random_address(),
        program=program_name,
        college=college_name,
        year_admitted=admitted,
        expected_graduation_year=expected_grad,
        status=status,
    )
    db.add(record)
    db.flush()
    return record


def enrollment_year_levels(record: StudentRecord) -> int:
    elapsed = max(1, CURRENT_YEAR - record.year_admitted + 1)
    max_curriculum = program_duration(record.program)
    if record.status == "dropped":
        return min(max_curriculum, max(1, elapsed - random.randint(1, 2)))
    return min(max_curriculum, elapsed)


def semester_rows_for_student(db: Session, record: StudentRecord) -> list[Enrollment]:
    rows = db.query(Enrollment).filter(Enrollment.student_id == record.sr_code).all()
    if rows:
        return rows

    year_levels = enrollment_year_levels(record)
    for level in range(1, year_levels + 1):
        ay_start = record.year_admitted + (level - 1)
        academic_year = f"{ay_start}-{ay_start + 1}"
        for semester in SEMESTERS:
            # 6-8 courses, all 3 units, keeps total 18-24.
            subject_count = random.randint(6, 8)
            db.add(
                Enrollment(
                    student_id=record.sr_code,
                    academic_year=academic_year,
                    semester=semester,
                    year_level=level,
                    total_units=subject_count * 3,
                )
            )

    db.flush()
    return db.query(Enrollment).filter(Enrollment.student_id == record.sr_code).all()


def assign_courses_and_grades(db: Session, record: StudentRecord, enrollments: list[Enrollment]) -> None:
    if db.query(EnrollmentCourse.id).join(Enrollment, EnrollmentCourse.enrollment_id == Enrollment.id).filter(
        Enrollment.student_id == record.sr_code
    ).first():
        return

    cumulative_weighted = 0.0
    cumulative_units = 0

    for enrollment in enrollments:
        offered = (
            db.query(CourseCatalog)
            .filter(
                CourseCatalog.program == record.program,
                CourseCatalog.year_level == enrollment.year_level,
                CourseCatalog.semester_offered == enrollment.semester,
            )
            .all()
        )
        if len(offered) < 6:
            # Fallback for sparse program-specific offerings.
            offered = (
                db.query(CourseCatalog)
                .filter(
                    CourseCatalog.year_level == enrollment.year_level,
                    CourseCatalog.semester_offered == enrollment.semester,
                )
                .limit(12)
                .all()
            )

        take_count = max(6, min(8, enrollment.total_units // 3))
        selected = random.sample(offered, k=min(take_count, len(offered)))

        sem_weighted = 0.0
        sem_units = 0
        for course in selected:
            db.add(EnrollmentCourse(enrollment_id=enrollment.id, course_id=course.id))
            g = weighted_grade()
            db.add(
                Grade(
                    student_id=record.sr_code,
                    enrollment_id=enrollment.id,
                    course_id=course.id,
                    grade=g,
                    remarks="PASSED" if g <= 3.00 else "FAILED",
                )
            )
            sem_weighted += g * course.units
            sem_units += course.units

        if sem_units > 0:
            sem_gwa = round(sem_weighted / sem_units, 2)
            db.add(
                SemesterGWA(
                    student_id=record.sr_code,
                    academic_year=enrollment.academic_year,
                    semester=enrollment.semester,
                    gwa=sem_gwa,
                )
            )
            cumulative_weighted += sem_weighted
            cumulative_units += sem_units

    if cumulative_units > 0 and record.status == "graduated":
        final_gwa = round(cumulative_weighted / cumulative_units, 2)
        if final_gwa <= 1.20:
            latin_honor = "Summa Cum Laude"
        elif final_gwa <= 1.45:
            latin_honor = "Magna Cum Laude"
        elif final_gwa <= 1.75:
            latin_honor = "Cum Laude"
        else:
            latin_honor = None

        if not db.query(Graduate).filter(Graduate.student_id == record.sr_code).first():
            db.add(
                Graduate(
                    student_id=record.sr_code,
                    program=record.program,
                    date_of_graduation=date(record.expected_graduation_year, random.randint(4, 7), random.randint(1, 28)),
                    board_resolution_number=f"BR-{record.expected_graduation_year}-{random.randint(1000, 9999)}",
                    latin_honor=latin_honor,
                )
            )

    if not db.query(NSTPRecord).filter(NSTPRecord.student_id == record.sr_code).first():
        completion_year = min(CURRENT_YEAR, record.year_admitted + 1)
        component = random.choice(NSTP_COMPONENTS)
        serial = f"{component}-{completion_year}-{random.randint(1, 999999):06d}"
        db.add(
            NSTPRecord(
                student_id=record.sr_code,
                component=component,
                serial_number=serial,
                date_completed=date(completion_year, random.randint(3, 12), random.randint(1, 28)),
            )
        )


def seed_registrar_simulation(target_students: int = DEFAULT_STUDENTS) -> None:
    target_students = clamp_target(target_students)
    db = SessionLocal()
    try:
        Base.metadata.create_all(bind=engine)

        programs = db.query(Program).options(joinedload(Program.college)).all()
        if not programs:
            raise RuntimeError("No programs found. Run academic_seeder.py first.")

        ensure_course_catalog(db, programs)
        students = ensure_students(db, target_students)
        print(f"Seeding registrar simulation for {len(students)} students...")

        for student in students:
            record = ensure_student_record(db, student)
            enrollments = semester_rows_for_student(db, record)
            assign_courses_and_grades(db, record, enrollments)

        db.commit()

        print("Seed complete.")
        print(
            "Summary: "
            f"student_records={db.query(StudentRecord).count()}, "
            f"course_catalog={db.query(CourseCatalog).count()}, "
            f"enrollments={db.query(Enrollment).count()}, "
            f"enrollment_courses={db.query(EnrollmentCourse).count()}, "
            f"grades={db.query(Grade).count()}, "
            f"semester_gwa={db.query(SemesterGWA).count()}, "
            f"graduates={db.query(Graduate).count()}, "
            f"nstp_records={db.query(NSTPRecord).count()}"
        )
    except Exception:
        db.rollback()
        raise
    finally:
        db.close()


if __name__ == "__main__":
    target = DEFAULT_STUDENTS
    if len(sys.argv) > 1:
        try:
            target = int(sys.argv[1])
        except ValueError:
            target = DEFAULT_STUDENTS

    print("=" * 72)
    print("Registrar simulation seeder")
    print("=" * 72)
    seed_registrar_simulation(target)
    print("=" * 72)
    print("Done.")
    print("=" * 72)
