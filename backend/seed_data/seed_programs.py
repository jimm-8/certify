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

DATA_PATH = os.path.join(os.path.dirname(__file__), "programs.json")

with open(DATA_PATH, "r", encoding="utf-8") as f:
    programs = json.load(f)

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
            # Build lookup maps for colleges and campuses
            cur.execute("SELECT id, name FROM colleges")
            college_map = {row[1].strip().lower(): row[0] for row in cur.fetchall()}

            cur.execute("SELECT id, name FROM campuses")
            campus_map = {row[1].strip().lower(): row[0] for row in cur.fetchall()}

            inserted = 0
            for p in programs:
                college_name = (p.get("college_name") or "").strip().lower()
                campus_name = (p.get("campus_name") or "").strip().lower()

                if college_name not in college_map:
                    raise ValueError(f"College not found: {p.get('college_name')}")
                if campus_name not in campus_map:
                    raise ValueError(f"Campus not found: {p.get('campus_name')}")

                cur.execute(
                    """
                    INSERT INTO programs (
                        name, code, major, college_id, campus_id,
                        course_board_resolution_num, course_academic_year, is_active
                    )
                    VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
                    """,
                    (
                        p.get("name"),
                        p.get("code"),
                        p.get("major"),
                        college_map[college_name],
                        campus_map[campus_name],
                        p.get("course_board_resolution_num"),
                        p.get("course_academic_year"),
                        p.get("is_active", 1),
                    ),
                )
                inserted += 1

finally:
    conn.close()

print("Seeded programs:", inserted)
