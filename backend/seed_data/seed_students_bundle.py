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

                # Students
                for s in data["students"]:
                    program_code = (s.get("program_code") or "").strip().lower()
                    campus_name = (s.get("campus_name") or "").strip().lower()
                    program_id = program_map.get(program_code)
                    campus_id = campus_map.get(campus_name) if campus_name else None

                    if not program_id:
                        raise ValueError(f"Program not found for code: {s.get('program_code')}")

                    cur.execute(
                        """
                        INSERT INTO students (
                            sr_code, first_name, middle_name, last_name, suffix,
                            gender, birthdate, nationality, program_id, campus_id,
                            major, year_level, email, contact_number
                        )
                        VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                        ON CONFLICT (sr_code) DO NOTHING
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

                # Enrollments
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
                            e.get("year_level"),
                            e.get("total_units"),
                            e.get("date_enrolled"),
                            e.get("status"),
                        ),
                    )

                # Academic Summary
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
