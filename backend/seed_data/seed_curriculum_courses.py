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

PROGRAM_CODE_ALIASES = {
    "bsaee": "BSAeE",
    "bsace": "BSAeE",
    "bsche": "BSChE",
    "bscpe": "BSCpE",
}


def canonical_program_code(code):
    raw = (code or "").strip()
    return PROGRAM_CODE_ALIASES.get(raw.lower(), raw)


def extract_payloads(path):
    with open(path, "r", encoding="utf-8") as f:
        payload = json.load(f)

    items = []
    containers = ("old", "new", "current", "latest", "data", "items", "records")

    if isinstance(payload, dict) and payload.get("courses"):
        items.append(payload)
    elif isinstance(payload, dict):
        for key in containers:
            value = payload.get(key)
            if isinstance(value, list):
                items.extend(item for item in value if isinstance(item, dict) and item.get("courses"))
    elif isinstance(payload, list):
        for outer in payload:
            if isinstance(outer, dict) and outer.get("courses"):
                items.append(outer)
                continue
            if isinstance(outer, dict):
                for key in containers:
                    value = outer.get(key)
                    if isinstance(value, list):
                        items.extend(
                            item for item in value if isinstance(item, dict) and item.get("courses")
                        )

    unique = []
    seen = set()
    for item in items:
        signature = (
            canonical_program_code(item.get("program_code")),
            (item.get("curriculum_name") or "").strip().lower(),
            (item.get("academic_year") or "").strip(),
        )
        if signature in seen:
            continue
        seen.add(signature)
        unique.append(item)

    if not unique:
        raise ValueError(f"Unsupported curriculum course format in {os.path.basename(path)}")
    return unique


def find_curriculum_id(cur, program_code, curriculum_name, academic_year):
    row = None

    if curriculum_name and academic_year:
        cur.execute(
            """
            SELECT c.id
            FROM curriculums c
            JOIN programs p ON p.id = c.program_id
            WHERE p.code = %s
              AND LOWER(TRIM(c.name)) = LOWER(TRIM(%s))
              AND COALESCE(c.academic_year, '') = %s
            ORDER BY c.id
            LIMIT 1
            """,
            (program_code, curriculum_name, academic_year),
        )
        row = cur.fetchone()

    if not row and curriculum_name:
        cur.execute(
            """
            SELECT c.id
            FROM curriculums c
            JOIN programs p ON p.id = c.program_id
            WHERE p.code = %s
              AND LOWER(TRIM(c.name)) = LOWER(TRIM(%s))
            ORDER BY c.id
            LIMIT 1
            """,
            (program_code, curriculum_name),
        )
        row = cur.fetchone()

    if not row and academic_year:
        cur.execute(
            """
            SELECT c.id
            FROM curriculums c
            JOIN programs p ON p.id = c.program_id
            WHERE p.code = %s
              AND COALESCE(c.academic_year, '') = %s
            ORDER BY c.id
            LIMIT 1
            """,
            (program_code, academic_year),
        )
        row = cur.fetchone()

    if not row:
        cur.execute(
            """
            SELECT c.id
            FROM curriculums c
            JOIN programs p ON p.id = c.program_id
            WHERE p.code = %s
            ORDER BY c.is_active DESC, c.id DESC
            LIMIT 1
            """,
            (program_code,),
        )
        row = cur.fetchone()

    if not row:
        raise ValueError(
            f"Curriculum not found for {program_code} / {curriculum_name or academic_year}"
        )
    return row[0]


def seed_payload(cur, payload):
    program_code = canonical_program_code(payload.get("program_code"))
    curriculum_name = (payload.get("curriculum_name") or "").strip()
    academic_year = (payload.get("academic_year") or "").strip()
    courses = payload.get("courses", [])

    if not program_code:
        raise ValueError("program_code is required")
    if not curriculum_name and not academic_year:
        raise ValueError("curriculum_name or academic_year is required")

    curriculum_id = find_curriculum_id(cur, program_code, curriculum_name, academic_year)

    # Replace links for the matched curriculum so reseeds refresh the exact set.
    cur.execute("DELETE FROM curriculum_courses WHERE curriculum_id = %s", (curriculum_id,))

    inserted_courses = 0
    inserted_links = 0

    for course in courses:
        course_code = course.get("course_code")
        if not course_code:
            continue

        cur.execute(
            """
            INSERT INTO courses (
                course_code, course_title, course_description,
                units, year_level, semester_offered, program
            )
            VALUES (%s, %s, %s, %s, %s, %s, %s)
            ON CONFLICT (course_code) DO UPDATE SET
                course_title = EXCLUDED.course_title,
                course_description = EXCLUDED.course_description,
                units = EXCLUDED.units,
                year_level = EXCLUDED.year_level,
                semester_offered = EXCLUDED.semester_offered,
                program = EXCLUDED.program
            """,
            (
                course.get("course_code"),
                course.get("course_title"),
                course.get("course_description", ""),
                course.get("units"),
                course.get("year_level"),
                course.get("semester_offered"),
                canonical_program_code(course.get("program") or program_code),
            ),
        )
        inserted_courses += 1

        cur.execute("SELECT id FROM courses WHERE course_code = %s", (course_code,))
        row = cur.fetchone()
        if not row:
            raise ValueError(f"Course not found after insert: {course_code}")

        cur.execute(
            """
            INSERT INTO curriculum_courses (curriculum_id, course_id, year_level, semester)
            VALUES (%s, %s, %s, %s)
            """,
            (
                curriculum_id,
                row[0],
                course.get("year_level"),
                course.get("semester_offered"),
            ),
        )
        inserted_links += 1

    return inserted_courses, inserted_links


def seed_from_file(path):
    payloads = extract_payloads(path)

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
                inserted_courses = 0
                inserted_links = 0
                for payload in payloads:
                    courses, links = seed_payload(cur, payload)
                    inserted_courses += courses
                    inserted_links += links
    finally:
        conn.close()

    return inserted_courses, inserted_links


if __name__ == "__main__":
    base = os.path.dirname(__file__)
    files = [
        os.path.join(base, "curriculum_courses_bsaee.json"),
        os.path.join(base, "curriculum_courses_bsche.json"),
        os.path.join(base, "curriculum_courses_bscpe.json"),
        os.path.join(base, "curriculum_courses_bsee.json"),
        os.path.join(base, "curriculum_courses_bsie.json"),
        os.path.join(base, "curriculum_courses_bsme.json"),
    ]

    total_courses = 0
    total_links = 0

    for fp in files:
        courses, links = seed_from_file(fp)
        total_courses += courses
        total_links += links
        print(f"Seeded from {os.path.basename(fp)}: courses={courses}, links={links}")

    print("Total inserted attempts:", total_courses, "courses;", total_links, "links")
