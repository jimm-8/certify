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

DATA_PATH = os.path.join(os.path.dirname(__file__), "courses.json")

with open(DATA_PATH, "r", encoding="utf-8") as f:
    courses = json.load(f)

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
            inserted = 0
            for c in courses:
                cur.execute(
                    """
                    INSERT INTO courses (
                        course_code, course_title, course_description,
                        units, year_level, semester_offered, program
                    )
                    VALUES (%s, %s, %s, %s, %s, %s, %s)
                    ON CONFLICT (course_code) DO NOTHING
                    """,
                    (
                        c.get("course_code"),
                        c.get("course_title"),
                        c.get("course_description", ""),
                        c.get("units"),
                        c.get("year_level"),
                        c.get("semester_offered"),
                        c.get("program"),
                    ),
                )
                inserted += 1
finally:
    conn.close()

print("Seeded courses:", inserted)
