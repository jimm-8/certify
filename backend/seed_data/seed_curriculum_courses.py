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
                # curriculum lookup
                cur.execute(
                    """
                    SELECT c.id
                    FROM curriculums c
                    JOIN programs p ON p.id = c.program_id
                    WHERE p.code = %s AND c.name = %s
                    """,
                    (program_code, curriculum_name),
                )
                row = cur.fetchone()
                if not row:
                    raise ValueError(f"Curriculum not found for {program_code} / {curriculum_name}")
                curriculum_id = row[0]

                inserted_courses = 0
                inserted_links = 0

                for c in courses:
                    course_code = c.get("course_code")
                    if not course_code:
                        continue

                    # Insert course if missing
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
                    inserted_courses += 1

                    # Get course id
                    cur.execute(
                        "SELECT id FROM courses WHERE course_code = %s",
                        (course_code,),
                    )
                    course_row = cur.fetchone()
                    if not course_row:
                        raise ValueError(f"Course not found after insert: {course_code}")
                    course_id = course_row[0]

                    # Link to curriculum
                    cur.execute(
                        """
                        INSERT INTO curriculum_courses (curriculum_id, course_id, year_level, semester)
                        VALUES (%s, %s, %s, %s)
                        ON CONFLICT DO NOTHING
                        """,
                        (
                            curriculum_id,
                            course_id,
                            c.get("year_level"),
                            c.get("semester_offered"),
                        ),
                    )
                    inserted_links += 1

    finally:
        conn.close()

    return inserted_courses, inserted_links


if __name__ == "__main__":
    base = os.path.dirname(__file__)
    files = [
        os.path.join(base, "curriculum_courses_bsee.json"),
        os.path.join(base, "curriculum_courses_bscpe.json"),
        os.path.join(base, "curriculum_courses_bsme.json"),
    ]

    total_courses = 0
    total_links = 0

    for fp in files:
        c, l = seed_from_file(fp)
        total_courses += c
        total_links += l
        print(f"Seeded from {os.path.basename(fp)}: courses={c}, links={l}")

    print("Total inserted attempts:", total_courses, "courses;", total_links, "links")
