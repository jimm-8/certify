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

DATA_PATH = os.path.join(os.path.dirname(__file__), "curriculums.json")

with open(DATA_PATH, "r", encoding="utf-8") as f:
    items = json.load(f)

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
            # program lookup by code
            cur.execute("SELECT id, code FROM programs")
            program_map = {row[1].strip().lower(): row[0] for row in cur.fetchall() if row[1]}

            inserted = 0
            updated = 0
            for it in items:
                code = (it.get("program_code") or "").strip().lower()
                if code not in program_map:
                    raise ValueError(f"Program code not found: {it.get('program_code')}")

                cur.execute(
                    """
                    SELECT id
                    FROM curriculums
                    WHERE program_id = %s
                      AND LOWER(TRIM(name)) = LOWER(TRIM(%s))
                      AND COALESCE(academic_year, '') = COALESCE(%s, '')
                    ORDER BY id
                    LIMIT 1
                    """,
                    (program_map[code], it.get("name"), it.get("academic_year")),
                )
                existing = cur.fetchone()

                if existing:
                    cur.execute(
                        """
                        UPDATE curriculums
                        SET is_active = %s
                        WHERE id = %s
                        """,
                        (it.get("is_active", True), existing[0]),
                    )
                    updated += 1
                else:
                    cur.execute(
                        """
                        INSERT INTO curriculums (program_id, name, academic_year, is_active)
                        VALUES (%s, %s, %s, %s)
                        """,
                        (
                            program_map[code],
                            it.get("name"),
                            it.get("academic_year"),
                            it.get("is_active", True),
                        ),
                    )
                    inserted += 1
finally:
    conn.close()

print("Seeded curriculums:", inserted, "inserted,", updated, "updated")
