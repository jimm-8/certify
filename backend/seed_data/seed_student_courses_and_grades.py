import hashlib
import json
import os
from collections import defaultdict

import psycopg2
from dotenv import load_dotenv

load_dotenv()

DB_NAME = os.getenv("DB_NAME", "certify-system")
DB_USER = os.getenv("DB_USER", "postgres")
DB_PASSWORD = os.getenv("DB_PASSWORD", "")
DB_HOST = os.getenv("DB_HOST", "localhost")
DB_PORT = os.getenv("DB_PORT", "5432")

DEFAULT_REMARKS = os.getenv("DEFAULT_REMARKS", "PASSED")
DEFAULT_TARGET_GWA = float(os.getenv("DEFAULT_TARGET_GWA", "1.75"))
GRADE_CHOICES = [1.00, 1.25, 1.50, 1.75, 2.00, 2.25, 2.50, 2.75, 3.00]
SEMESTER_ORDER = {"1st": 1, "2nd": 2, "Midterm": 3, "Elective": 4}

BASE_DIR = os.path.dirname(__file__)
FILES = [
    os.path.join(BASE_DIR, "curriculum_courses_bsaee.json"),
    os.path.join(BASE_DIR, "curriculum_courses_bsche.json"),
    os.path.join(BASE_DIR, "curriculum_courses_bscpe.json"),
    os.path.join(BASE_DIR, "curriculum_courses_bsee.json"),
    os.path.join(BASE_DIR, "curriculum_courses_bsie.json"),
    os.path.join(BASE_DIR, "curriculum_courses_bsme.json"),
]
ACADEMIC_SUMMARY_PATH = os.path.join(BASE_DIR, "academic_summary.json")

PROGRAM_CODE_ALIASES = {
    "bsaee": "BSAeE",
    "bsace": "BSAeE",
    "bsche": "BSChE",
    "bscpe": "BSCpE",
}


def load_json(path):
    with open(path, "r", encoding="utf-8") as f:
        return json.load(f)


def canonical_program_code(code):
    raw = str(code or "").strip()
    return PROGRAM_CODE_ALIASES.get(raw.lower(), raw)


def extract_curriculum_payloads(path):
    payload = load_json(path)
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
            str(item.get("curriculum_name") or "").strip().lower(),
            str(item.get("academic_year") or "").strip(),
        )
        if signature in seen:
            continue
        seen.add(signature)
        unique.append(item)

    if not unique:
        raise ValueError(f"Unsupported curriculum payload format: {os.path.basename(path)}")
    return unique


def normalize_year_level(value):
    if value is None:
        return None
    if isinstance(value, int):
        return value
    text = str(value).strip()
    digits = "".join(ch for ch in text if ch.isdigit())
    return int(digits) if digits else None


def academic_year_key(value):
    text = str(value or "").strip()
    head = text.split("-")[0]
    try:
        return int(head)
    except ValueError:
        return -1


def semester_key(value):
    return SEMESTER_ORDER.get(str(value or "").strip(), 99)


def stable_index(seed_value, size):
    digest = hashlib.sha256(seed_value.encode("utf-8")).hexdigest()
    return int(digest[:8], 16) % size


def build_initial_grade(row, target_gwa):
    center_idx = min(
        range(len(GRADE_CHOICES)),
        key=lambda idx: abs(GRADE_CHOICES[idx] - target_gwa),
    )
    start = max(0, center_idx - 1)
    end = min(len(GRADE_CHOICES), center_idx + 2)
    pool = GRADE_CHOICES[start:end]
    grade_idx = stable_index(
        f"{row['student_id']}|{row['course_code']}|{row['academic_year']}|{row['semester']}",
        len(pool),
    )
    return pool[grade_idx]


def weighted_average(values):
    total_units = sum(item["units"] for item in values)
    if total_units <= 0:
        return None
    weighted_sum = sum(item["grade"] * item["units"] for item in values)
    return round(weighted_sum / total_units, 2)


def generate_grades(rows, target_gwa):
    if not rows:
        return []

    grade_rows = []
    for row in rows:
        grade_rows.append(
            {
                **row,
                "grade": build_initial_grade(row, target_gwa),
            }
        )

    total_units = sum(row["units"] for row in grade_rows)
    if total_units <= 0:
        return grade_rows

    for _ in range(200):
        current_gwa = weighted_average(grade_rows)
        if current_gwa is None or abs(current_gwa - target_gwa) <= 0.01:
            break

        need_higher_numeric_grade = current_gwa < target_gwa
        best_idx = None
        best_grade = None
        best_gap = abs(current_gwa - target_gwa)

        for idx, row in enumerate(grade_rows):
            current_idx = GRADE_CHOICES.index(row["grade"])
            next_idx = current_idx + 1 if need_higher_numeric_grade else current_idx - 1
            if next_idx < 0 or next_idx >= len(GRADE_CHOICES):
                continue

            candidate_grade = GRADE_CHOICES[next_idx]
            new_weighted = (
                sum(item["grade"] * item["units"] for item in grade_rows)
                - (row["grade"] * row["units"])
                + (candidate_grade * row["units"])
            )
            candidate_gwa = round(new_weighted / total_units, 2)
            candidate_gap = abs(candidate_gwa - target_gwa)
            if candidate_gap < best_gap:
                best_idx = idx
                best_grade = candidate_grade
                best_gap = candidate_gap

        if best_idx is None:
            break

        grade_rows[best_idx]["grade"] = best_grade

    return grade_rows


def load_program_configs():
    configs = []
    for path in FILES:
        for payload in extract_curriculum_payloads(path):
            courses = payload.get("courses", [])
            curriculum_map = defaultdict(list)
            curriculum_total_units = 0

            for course in courses:
                year_level = normalize_year_level(course.get("year_level"))
                semester = str(course.get("semester_offered") or "").strip()
                units = int(course.get("units") or 0)
                curriculum_total_units += units
                curriculum_map[(year_level, semester)].append(
                    {
                        "course_code": course.get("course_code"),
                        "units": units,
                    }
                )

            configs.append(
                {
                    "program_code": canonical_program_code(payload.get("program_code")),
                    "curriculum_name": str(payload.get("curriculum_name") or "").strip(),
                    "academic_year": str(payload.get("academic_year") or "").strip(),
                    "curriculum_total_units": curriculum_total_units,
                    "curriculum_map": curriculum_map,
                }
            )
    return configs


def choose_curriculum_for_student(curriculum_options, first_enrollment_year):
    eligible = [
        item
        for item in curriculum_options
        if academic_year_key(item["academic_year"]) <= first_enrollment_year
    ]
    if not eligible:
        if not curriculum_options:
            return None
        return min(curriculum_options, key=lambda item: academic_year_key(item["academic_year"]))
    return max(eligible, key=lambda item: academic_year_key(item["academic_year"]))


def build_curriculum_index(rows):
    return {row["curriculum_id"]: row for row in rows}


def load_target_summary_map():
    if not os.path.exists(ACADEMIC_SUMMARY_PATH):
        return {}
    payload = load_json(ACADEMIC_SUMMARY_PATH)
    return {
        item.get("sr_code"): item
        for item in payload
        if item.get("sr_code")
    }


def main():
    configs = load_program_configs()
    summary_targets = load_target_summary_map()

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
                curricula_by_program = defaultdict(list)
                for config in configs:
                    row = None
                    if config["academic_year"]:
                        cur.execute(
                            """
                            SELECT c.id, p.id, c.academic_year
                            FROM curriculums c
                            JOIN programs p ON p.id = c.program_id
                            WHERE p.code = %s
                              AND LOWER(TRIM(c.name)) = LOWER(TRIM(%s))
                              AND COALESCE(c.academic_year, '') = %s
                            ORDER BY c.id
                            LIMIT 1
                            """,
                            (
                                config["program_code"],
                                config["curriculum_name"],
                                config["academic_year"],
                            ),
                        )
                        row = cur.fetchone()
                    if not row:
                        cur.execute(
                            """
                            SELECT c.id, p.id, c.academic_year
                            FROM curriculums c
                            JOIN programs p ON p.id = c.program_id
                            WHERE p.code = %s
                              AND LOWER(TRIM(c.name)) = LOWER(TRIM(%s))
                            ORDER BY c.id
                            LIMIT 1
                            """,
                            (config["program_code"], config["curriculum_name"]),
                        )
                        row = cur.fetchone()
                    if not row and config["academic_year"]:
                        cur.execute(
                            """
                            SELECT c.id, p.id, c.academic_year
                            FROM curriculums c
                            JOIN programs p ON p.id = c.program_id
                            WHERE p.code = %s
                              AND COALESCE(c.academic_year, '') = %s
                            ORDER BY c.id
                            LIMIT 1
                            """,
                            (config["program_code"], config["academic_year"]),
                        )
                        row = cur.fetchone()
                    if not row:
                        cur.execute(
                            """
                            SELECT c.id, p.id, c.academic_year
                            FROM curriculums c
                            JOIN programs p ON p.id = c.program_id
                            WHERE p.code = %s
                            ORDER BY c.is_active DESC, c.id DESC
                            LIMIT 1
                            """,
                            (config["program_code"],),
                        )
                        row = cur.fetchone()
                    if not row:
                        raise ValueError(
                            f"Curriculum not found for {config['program_code']} / {config['curriculum_name']}"
                        )
                    curricula_by_program[config["program_code"]].append(
                        {
                            "curriculum_id": row[0],
                            "program_id": row[1],
                            "academic_year": row[2],
                            "curriculum_name": config["curriculum_name"],
                            "curriculum_map": config["curriculum_map"],
                            "curriculum_total_units": config["curriculum_total_units"],
                        }
                    )

                program_meta_by_id = {}
                for program_code, items in curricula_by_program.items():
                    for item in items:
                        program_meta_by_id[item["program_id"]] = {
                            "program_code": program_code,
                        }
                curriculum_by_id = build_curriculum_index(
                    [item for items in curricula_by_program.values() for item in items]
                )

                curriculum_by_student = {}
                for _program_code, items in curricula_by_program.items():
                    items.sort(key=lambda item: academic_year_key(item["academic_year"]))

                cur.execute("SELECT id, sr_code, program_id, curriculum_id FROM students")
                students = cur.fetchall()
                students_by_program = defaultdict(list)
                student_program_by_sr = {}
                for student_id, sr_code, program_id, curriculum_id in students:
                    students_by_program[program_id].append(sr_code)
                    student_program_by_sr[sr_code] = {
                        "program_id": program_id,
                        "curriculum_id": curriculum_id,
                    }

                cur.execute(
                    """
                    SELECT id, course_code, units
                    FROM courses
                    """
                )
                course_rows = cur.fetchall()
                course_id_by_code = {row[1]: row[0] for row in course_rows}
                course_units_by_id = {row[0]: int(row[2] or 0) for row in course_rows}

                cur.execute(
                    """
                    SELECT id, student_id, academic_year, semester, year_level, date_enrolled
                    FROM enrollments
                    """
                )
                enrollments_by_student = defaultdict(list)
                for row in cur.fetchall():
                    enrollments_by_student[row[1]].append(
                        {
                            "id": row[0],
                            "student_id": row[1],
                            "academic_year": row[2],
                            "semester": row[3],
                            "year_level": normalize_year_level(row[4]),
                            "date_enrolled": row[5],
                        }
                    )

                for _student_id, sr_code, program_id, explicit_curriculum_id in students:
                    if explicit_curriculum_id:
                        chosen = curriculum_by_id.get(explicit_curriculum_id)
                        if chosen is None:
                            raise ValueError(
                                f"Student {sr_code} references missing curriculum_id {explicit_curriculum_id}"
                            )
                        if chosen["program_id"] != program_id:
                            raise ValueError(
                                f"Student {sr_code} curriculum_id {explicit_curriculum_id} "
                                f"does not belong to the student's program"
                            )
                        curriculum_by_student[sr_code] = chosen
                        continue

                    enrollments = enrollments_by_student.get(sr_code, [])
                    if not enrollments:
                        continue
                    first_enrollment = min(
                        enrollments,
                        key=lambda item: (
                            academic_year_key(item["academic_year"]),
                            item["year_level"] or -1,
                            semester_key(item["semester"]),
                        ),
                    )
                    program_code = program_meta_by_id.get(program_id, {}).get("program_code")
                    if not program_code:
                        continue
                    chosen = choose_curriculum_for_student(
                        curricula_by_program.get(program_code, []),
                        academic_year_key(first_enrollment["academic_year"]),
                    )
                    if chosen is None:
                        raise ValueError(
                            f"No curriculum found for student {sr_code} in program {program_code} "
                            f"at first enrollment {first_enrollment['academic_year']}"
                        )
                    curriculum_by_student[sr_code] = chosen

                cur.execute(
                    """
                    SELECT sr_code, is_currently_enrolled, academic_year, semester_current
                    FROM student_id_records
                    """
                )
                current_term_by_student = {}
                for sr_code, is_current, academic_year, semester_current in cur.fetchall():
                    if is_current:
                        current_term_by_student[sr_code] = (
                            str(academic_year or "").strip(),
                            str(semester_current or "").strip(),
                        )

                cur.execute("SELECT sr_code FROM graduation_records WHERE is_graduated = TRUE")
                graduated_students = {row[0] for row in cur.fetchall()}

                inserted_links = 0
                upserted_grades = 0
                deleted_current_grades = 0
                enrollment_updates = 0

                for sr_code, student_meta in student_program_by_sr.items():
                    meta = curriculum_by_student.get(sr_code)
                    if meta is None:
                        continue

                    enrollments = sorted(
                        enrollments_by_student.get(sr_code, []),
                        key=lambda item: (
                            academic_year_key(item["academic_year"]),
                            item["year_level"] or -1,
                            semester_key(item["semester"]),
                        ),
                    )
                    current_term = current_term_by_student.get(sr_code)
                    target_summary = summary_targets.get(sr_code, {})
                    target_gwa = float(
                        target_summary.get("gwa")
                        if target_summary.get("gwa") is not None
                        else DEFAULT_TARGET_GWA
                    )

                    graded_rows = []

                    for enrollment in enrollments:
                        term_key = (enrollment["year_level"], str(enrollment["semester"] or "").strip())
                        curriculum_courses = meta["curriculum_map"].get(term_key, [])
                        actual_total_units = sum(course["units"] for course in curriculum_courses)

                        if actual_total_units and enrollment["id"]:
                            cur.execute(
                                """
                                UPDATE enrollments
                                SET total_units = %s
                                WHERE id = %s AND COALESCE(total_units, -1) <> %s
                                """,
                                (actual_total_units, enrollment["id"], actual_total_units),
                            )
                            enrollment_updates += cur.rowcount

                        is_current_open_term = (
                            sr_code not in graduated_students
                            and current_term is not None
                            and enrollment["academic_year"] == current_term[0]
                            and str(enrollment["semester"] or "").strip() == current_term[1]
                        )

                        for course in curriculum_courses:
                            course_id = course_id_by_code.get(course["course_code"])
                            if not course_id:
                                raise ValueError(
                                    f"Course not found for code: {course['course_code']}"
                                )

                            cur.execute(
                                """
                                SELECT 1
                                FROM student_courses
                                WHERE enrollment_id = %s AND course_id = %s
                                """,
                                (enrollment["id"], course_id),
                            )
                            if cur.fetchone() is None:
                                cur.execute(
                                    """
                                    INSERT INTO student_courses (
                                        enrollment_id, course_id, academic_year, semester
                                    )
                                    VALUES (%s, %s, %s, %s)
                                    """,
                                    (
                                        enrollment["id"],
                                        course_id,
                                        enrollment["academic_year"],
                                        enrollment["semester"],
                                    ),
                                )
                                inserted_links += 1

                            if is_current_open_term:
                                cur.execute(
                                    """
                                    DELETE FROM grades
                                    WHERE enrollment_id = %s AND course_id = %s
                                    """,
                                    (enrollment["id"], course_id),
                                )
                                deleted_current_grades += cur.rowcount
                                continue

                            graded_rows.append(
                                {
                                    "student_id": sr_code,
                                    "enrollment_id": enrollment["id"],
                                    "course_id": course_id,
                                    "course_code": course["course_code"],
                                    "units": int(course_units_by_id.get(course_id, course["units"]) or 0),
                                    "academic_year": enrollment["academic_year"],
                                    "semester": enrollment["semester"],
                                }
                            )

                    generated_grades = generate_grades(graded_rows, target_gwa)
                    for row in generated_grades:
                        cur.execute(
                            """
                            SELECT id
                            FROM grades
                            WHERE enrollment_id = %s AND course_id = %s
                            """,
                            (row["enrollment_id"], row["course_id"]),
                        )
                        existing = cur.fetchone()
                        if existing:
                            cur.execute(
                                """
                                UPDATE grades
                                SET grade = %s, remarks = %s
                                WHERE id = %s
                                """,
                                (row["grade"], DEFAULT_REMARKS, existing[0]),
                            )
                        else:
                            cur.execute(
                                """
                                INSERT INTO grades (
                                    student_id, enrollment_id, course_id, grade, remarks
                                )
                                VALUES (%s, %s, %s, %s, %s)
                                """,
                                (
                                    sr_code,
                                    row["enrollment_id"],
                                    row["course_id"],
                                    row["grade"],
                                    DEFAULT_REMARKS,
                                ),
                            )
                        upserted_grades += 1

                cur.execute(
                    """
                    SELECT
                        s.sr_code,
                        p.code,
                        e.academic_year,
                        e.semester,
                        e.year_level,
                        c.units,
                        g.grade
                    FROM students s
                    JOIN programs p ON p.id = s.program_id
                    LEFT JOIN grades g ON g.student_id = s.sr_code
                    LEFT JOIN enrollments e ON e.id = g.enrollment_id
                    LEFT JOIN courses c ON c.id = g.course_id
                    ORDER BY s.sr_code
                    """
                )
                grade_rows = cur.fetchall()
                grade_rows_by_student = defaultdict(list)
                for row in grade_rows:
                    sr_code = row[0]
                    if row[2] is None:
                        continue
                    grade_rows_by_student[sr_code].append(
                        {
                            "program_code": row[1],
                            "academic_year": row[2],
                            "semester": row[3],
                            "year_level": normalize_year_level(row[4]),
                            "units": int(row[5] or 0),
                            "grade": float(row[6]),
                        }
                    )

                cur.execute("DELETE FROM academic_summary")

                summary_count = 0
                for sr_code, student_meta in student_program_by_sr.items():
                    enrollments = enrollments_by_student.get(sr_code, [])
                    if not enrollments:
                        continue

                    latest_enrollment = max(
                        enrollments,
                        key=lambda item: (
                            academic_year_key(item["academic_year"]),
                            item["year_level"] or -1,
                            semester_key(item["semester"]),
                        ),
                    )

                    graded = grade_rows_by_student.get(sr_code, [])
                    total_units_earned = sum(item["units"] for item in graded)
                    total_weighted_grades = sum(
                        item["units"] * item["grade"] for item in graded
                    )
                    gwa = (
                        round(total_weighted_grades / total_units_earned, 2)
                        if total_units_earned
                        else None
                    )

                    curriculum_total_units = (
                        curriculum_by_student.get(sr_code, {}).get("curriculum_total_units")
                    )
                    cumulative_units_earned = total_units_earned
                    if curriculum_total_units is not None:
                        cumulative_units_earned = min(
                            total_units_earned, curriculum_total_units
                        )

                    status = (
                        summary_targets.get(sr_code, {}).get("status")
                        or ("graduated" if sr_code in graduated_students else "regular")
                    )

                    cur.execute(
                        """
                        INSERT INTO academic_summary (
                            sr_code, academic_year, semester, gwa,
                            total_units_earned, cumulative_units_earned, status
                        )
                        VALUES (%s, %s, %s, %s, %s, %s, %s)
                        """,
                        (
                            sr_code,
                            latest_enrollment["academic_year"],
                            latest_enrollment["semester"],
                            gwa,
                            total_units_earned,
                            cumulative_units_earned,
                            status,
                        ),
                    )
                    summary_count += 1

    finally:
        conn.close()

    print(
        "Seeded student course history:",
        {
            "student_course_links_added": inserted_links,
            "grades_upserted": upserted_grades,
            "current_term_grades_removed": deleted_current_grades,
            "enrollments_retotaled": enrollment_updates,
            "academic_summaries_rebuilt": summary_count,
        },
    )


if __name__ == "__main__":
    main()
