import json
import os
import random
import psycopg2
from dotenv import load_dotenv

load_dotenv()

DB_NAME = os.getenv("DB_NAME", "certify-system")
DB_USER = os.getenv("DB_USER", "postgres")
DB_PASSWORD = os.getenv("DB_PASSWORD", "")
DB_HOST = os.getenv("DB_HOST", "localhost")
DB_PORT = os.getenv("DB_PORT", "5432")

DEFAULT_REMARKS = os.getenv("DEFAULT_REMARKS", "PASSED")

# Allowed grade choices (1.00 to 3.00)
GRADE_CHOICES = [1.00, 1.25, 1.50, 1.75, 2.00, 2.25, 2.50, 2.75, 3.00]

BASE_DIR = os.path.dirname(__file__)

FILES = [
    os.path.join(BASE_DIR, "curriculum_courses_bscpe.json"),
    os.path.join(BASE_DIR, "curriculum_courses_bsee.json"),
    os.path.join(BASE_DIR, "curriculum_courses_bsme.json"),
]


# Skip grades for 4th year 2nd sem (unless graduated)
SKIP_GRADE_RULE = {
    "year_level": 4,
    "semester": "2nd",
}


def seed_from_file(path):
    with open(path, "r", encoding="utf-8") as f:
        payload = json.load(f)

    program_code = (payload.get("program_code") or "").strip()
    curriculum_name = (payload.get("curriculum_name") or "").strip()
    courses = payload.get("courses", [])

    if not program_code or not curriculum_name:
        raise ValueError("program_code and curriculum_name are required")

    conn = psycopg2.connect(
        dbname=DB_NAME,
        user=DB_USER,
        password=DB_PASSWORD,
        host=DB_HOST,
        port=DB_PORT,
    )

    try:
        with conn:
            with conn.cursor() as cur:
                # Curriculum lookup
                cur.execute(
                    """
                    SELECT c.id, p.id
                    FROM curriculums c
                    JOIN programs p ON p.id = c.program_id
                    WHERE p.code = %s AND c.name = %s
                    """,
                    (program_code, curriculum_name),
                )
                row = cur.fetchone()
                if not row:
                    raise ValueError(f"Curriculum not found for {program_code} / {curriculum_name}")
                curriculum_id, program_id = row

                # Build student program map
                cur.execute("SELECT sr_code, program_id FROM students")
                student_program_map = {r[0]: r[1] for r in cur.fetchall()}

                # Build graduated students set
                cur.execute("SELECT sr_code FROM graduation_records WHERE is_graduated = TRUE")
                graduated_set = {r[0] for r in cur.fetchall()}

                # Load enrollments
                cur.execute("SELECT id, student_id, academic_year, semester, year_level FROM enrollments")
                enrollments = cur.fetchall()

                # For each enrollment, link matching curriculum courses
                for enrollment_id, student_id, academic_year, semester, year_level in enrollments:
                    student_program_id = student_program_map.get(student_id)
                    if student_program_id != program_id:
                        continue

                    # Get curriculum courses for this year_level + semester
                    cur.execute(
                        """
                        SELECT cc.course_id
                        FROM curriculum_courses cc
                        WHERE cc.curriculum_id = %s
                          AND cc.year_level = %s
                          AND cc.semester = %s
                        """,
                        (curriculum_id, year_level, semester),
                    )
                    course_ids = [r[0] for r in cur.fetchall()]

                    for course_id in course_ids:
                        # Insert student_courses if not exists
                        cur.execute(
                            "SELECT 1 FROM student_courses WHERE enrollment_id = %s AND course_id = %s",
                            (enrollment_id, course_id),
                        )
                        if cur.fetchone() is None:
                            cur.execute(
                                """
                                INSERT INTO student_courses (
                                    enrollment_id, course_id, academic_year, semester
                                )
                                VALUES (%s, %s, %s, %s)
                                """,
                                (enrollment_id, course_id, academic_year, semester),
                            )

                        # Insert grades (skip 4th year 2nd sem)
                        if (
                            student_id not in graduated_set
                            and year_level == SKIP_GRADE_RULE["year_level"]
                            and semester == SKIP_GRADE_RULE["semester"]
                        ):
                            continue

                        grade_value = random.choice(GRADE_CHOICES)

                        cur.execute(
                            "SELECT 1 FROM grades WHERE enrollment_id = %s AND course_id = %s",
                            (enrollment_id, course_id),
                        )
                        if cur.fetchone() is None:
                            cur.execute(
                                """
                                INSERT INTO grades (
                                    student_id, enrollment_id, course_id, grade, remarks
                                )
                                VALUES (%s, %s, %s, %s, %s)
                                """,
                                (
                                    student_id,
                                    enrollment_id,
                                    course_id,
                                    grade_value,
                                    DEFAULT_REMARKS,
                                ),
                            )

    finally:
        conn.close()


if __name__ == "__main__":
    for fp in FILES:
        seed_from_file(fp)
    print("Seeded student_courses (and optional grades) for BSCpE")
