import json
import os
import psycopg2
from dotenv import load_dotenv

load_dotenv()

DB_NAME = os.getenv("DB_NAME", "certify-system")
DB_USER = os.getenv("DB_USER", "postgres")
DB_PASSWORD = os.getenv("DB_PASSWORD", "")
DB_HOST = os.getenv("DB_HOST", "localhost")
DB_PORT = os.getenv("DB_PORT", "5432")

BASE_DIR = os.path.dirname(__file__)

FILES = {
    "students": os.path.join(BASE_DIR, "students.json"),
    "student_address": os.path.join(BASE_DIR, "student_address.json"),
    "enrollments": os.path.join(BASE_DIR, "enrollments.json"),
    "academic_summary": os.path.join(BASE_DIR, "academic_summary.json"),
    "graduation_records": os.path.join(BASE_DIR, "graduation_records.json"),
    "nstp_records": os.path.join(BASE_DIR, "nstp_records.json"),
    "student_id_records": os.path.join(BASE_DIR, "student_id_records.json"),
}


def load_json(path):
    if not os.path.exists(path):
        return []
    with open(path, "r", encoding="utf-8") as f:
        return json.load(f)


def normalize_year_level(value):
    if value is None:
        return None
    if isinstance(value, int):
        return value
    text = str(value).strip()
    digits = "".join(ch for ch in text if ch.isdigit())
    return int(digits) if digits else None


def main():
    data = {k: load_json(v) for k, v in FILES.items()}

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
                # Lookups
                cur.execute("SELECT id, code FROM programs")
                program_map = {row[1].strip().lower(): row[0] for row in cur.fetchall() if row[1]}

                cur.execute("SELECT id, name FROM campuses")
                campus_map = {row[1].strip().lower(): row[0] for row in cur.fetchall()}

                cur.execute(
                    """
                    SELECT c.id, p.code, c.name, c.academic_year
                    FROM curriculums c
                    JOIN programs p ON p.id = c.program_id
                    """
                )
                curriculum_lookup = {}
                for curriculum_id, program_code, curriculum_name, academic_year in cur.fetchall():
                    code_key = (program_code or "").strip().lower()
                    name_key = (curriculum_name or "").strip().lower()
                    year_key = (academic_year or "").strip()
                    if code_key and name_key:
                        curriculum_lookup[("name", code_key, name_key)] = curriculum_id
                    if code_key and year_key:
                        curriculum_lookup[("year", code_key, year_key)] = curriculum_id

                # Students
                for s in data["students"]:
                    program_code = (s.get("program_code") or "").strip().lower()
                    campus_name = (s.get("campus_name") or "").strip().lower()
                    program_id = program_map.get(program_code)
                    campus_id = campus_map.get(campus_name) if campus_name else None
                    curriculum_id = s.get("curriculum_id")
                    curriculum_name = (s.get("curriculum_name") or "").strip().lower()
                    curriculum_year = (s.get("curriculum_academic_year") or "").strip()

                    if not program_id:
                        raise ValueError(f"Program not found for code: {s.get('program_code')}")

                    if not curriculum_id and curriculum_name:
                        curriculum_id = curriculum_lookup.get(("name", program_code, curriculum_name))
                    if not curriculum_id and curriculum_year:
                        curriculum_id = curriculum_lookup.get(("year", program_code, curriculum_year))

                    cur.execute(
                        """
                        INSERT INTO students (
                            sr_code, first_name, middle_name, last_name, suffix,
                            gender, birthdate, nationality, program_id, campus_id, curriculum_id,
                            major, year_level, email, contact_number
                        )
                        VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                        ON CONFLICT (sr_code) DO UPDATE SET
                            first_name = EXCLUDED.first_name,
                            middle_name = EXCLUDED.middle_name,
                            last_name = EXCLUDED.last_name,
                            suffix = EXCLUDED.suffix,
                            gender = EXCLUDED.gender,
                            birthdate = EXCLUDED.birthdate,
                            nationality = EXCLUDED.nationality,
                            program_id = EXCLUDED.program_id,
                            campus_id = EXCLUDED.campus_id,
                            curriculum_id = COALESCE(EXCLUDED.curriculum_id, students.curriculum_id),
                            major = EXCLUDED.major,
                            year_level = EXCLUDED.year_level,
                            email = EXCLUDED.email,
                            contact_number = EXCLUDED.contact_number
                        """,
                        (
                            s.get("sr_code"),
                            s.get("first_name"),
                            s.get("middle_name"),
                            s.get("last_name"),
                            s.get("suffix"),
                            s.get("gender"),
                            s.get("birthdate"),
                            s.get("nationality"),
                            program_id,
                            campus_id,
                            curriculum_id,
                            s.get("major"),
                            s.get("year_level"),
                            s.get("email"),
                            s.get("contact_number"),
                        ),
                    )

                # Student Address
                cur.execute("SELECT id, sr_code FROM students")
                student_id_map = {row[1]: row[0] for row in cur.fetchall()}

                for a in data["student_address"]:
                    sid = student_id_map.get(a.get("sr_code"))
                    if not sid:
                        raise ValueError(f"Student not found for address sr_code: {a.get('sr_code')}")

                    cur.execute("DELETE FROM student_address WHERE student_id = %s", (sid,))
                    cur.execute(
                        """
                        INSERT INTO student_address (
                            student_id, address_line, city, province, zip_code, country
                        )
                        VALUES (%s, %s, %s, %s, %s, %s)
                        """,
                        (
                            sid,
                            a.get("address_line"),
                            a.get("city"),
                            a.get("province"),
                            a.get("zip_code"),
                            a.get("country"),
                        ),
                    )

                # Clear dependent history first so reruns can rebuild from scratch.
                cur.execute("DELETE FROM grades")
                cur.execute("DELETE FROM student_courses")

                # Enrollments
                cur.execute("DELETE FROM enrollments")
                for e in data["enrollments"]:
                    cur.execute(
                        """
                        INSERT INTO enrollments (
                            student_id, academic_year, semester, year_level,
                            total_units, date_enrolled, status
                        )
                        VALUES (%s, %s, %s, %s, %s, %s, %s)
                        """,
                        (
                            e.get("sr_code"),
                            e.get("academic_year"),
                            e.get("semester"),
                            normalize_year_level(e.get("year_level")),
                            e.get("total_units"),
                            e.get("date_enrolled"),
                            e.get("status"),
                        ),
                    )

                # Academic Summary
                cur.execute("DELETE FROM academic_summary")
                for a in data["academic_summary"]:
                    cur.execute(
                        """
                        INSERT INTO academic_summary (
                            sr_code, academic_year, semester, gwa,
                            total_units_earned, cumulative_units_earned, status
                        )
                        VALUES (%s, %s, %s, %s, %s, %s, %s)
                        """,
                        (
                            a.get("sr_code"),
                            a.get("academic_year"),
                            a.get("semester"),
                            a.get("gwa"),
                            a.get("total_units_earned"),
                            a.get("cumulative_units_earned"),
                            a.get("status"),
                        ),
                    )

                # Graduation Records
                cur.execute("DELETE FROM graduation_records")
                for g in data["graduation_records"]:
                    cur.execute(
                        """
                        INSERT INTO graduation_records (
                            sr_code, student_name, is_graduated, status,
                            proposed_graduation_date, program, date_of_graduation,
                            board_resolution_number, semester, academic_year
                        )
                        VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                        """,
                        (
                            g.get("sr_code"),
                            g.get("student_name"),
                            g.get("is_graduated"),
                            g.get("status"),
                            g.get("proposed_graduation_date"),
                            g.get("program"),
                            g.get("date_of_graduation"),
                            g.get("board_resolution_number"),
                            g.get("semester"),
                            g.get("academic_year"),
                        ),
                    )

                # NSTP Records
                cur.execute("DELETE FROM nstp_records")
                for n in data["nstp_records"]:
                    cur.execute(
                        """
                        INSERT INTO nstp_records (
                            student_id, component, serial_number, date_completed
                        )
                        VALUES (%s, %s, %s, %s)
                        """,
                        (
                            n.get("sr_code"),
                            n.get("component"),
                            n.get("serial_number"),
                            n.get("date_completed"),
                        ),
                    )

                # Student ID Records
                cur.execute("DELETE FROM student_id_records")
                for s in data["student_id_records"]:
                    cur.execute(
                        """
                        INSERT INTO student_id_records (
                            sr_code, student_name, is_currently_enrolled,
                            year_attended_start, year_attended_end,
                            semester_current, academic_year
                        )
                        VALUES (%s, %s, %s, %s, %s, %s, %s)
                        """,
                        (
                            s.get("sr_code"),
                            s.get("student_name"),
                            s.get("is_currently_enrolled"),
                            s.get("year_attended_start"),
                            s.get("year_attended_end"),
                            s.get("semester_current"),
                            s.get("academic_year"),
                        ),
                    )

    finally:
        conn.close()

    print("Seeded students bundle:", {k: len(v) for k, v in data.items()})


if __name__ == "__main__":
    main()
