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

DATA_PATH = os.path.join(os.path.dirname(__file__), "campuses.json")

with open(DATA_PATH, "r", encoding="utf-8") as f:
    campuses = json.load(f)

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
            for c in campuses:
                cur.execute(
                    """
                    INSERT INTO campuses (name, campus_address, campus_telNo, campus_email, campus_certCode)
                    VALUES (%s, %s, %s, %s, %s)
                    """,
                    (
                        c.get("name"),
                        c.get("campus_address"),
                        c.get("campus_telNo"),
                        c.get("campus_email"),
                        c.get("campus_certCode"),
                    ),
                )
finally:
    conn.close()

print("Seeded campuses:", len(campuses))
