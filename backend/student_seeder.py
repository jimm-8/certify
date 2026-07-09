from app.database import SessionLocal
from app.models.student import Student
from app.models.program import Program
import random


def generate_sr_code(existing_codes, year_prefix="24"):
    while True:
        number = random.randint(10000, 99999)
        sr = f"{year_prefix}-{number}"
        if sr not in existing_codes:
            return sr


def seed_students():

    db = SessionLocal()

    try:
        programs = db.query(Program).all()

        if not programs:
            print("❌ No programs found. Run academic_seeder.py first.")
            return

        # Filipino first names
        first_names = [
            "Juan", "Maria", "Jose", "Mark", "John", "Christian",
            "Angela", "Rica", "Paolo", "Carlo", "Jessa", "Princess",
            "Rafael", "Miguel", "Gabriel", "Kim", "Joy", "Patrick",
            "Jerome", "Nicole", "Joshua", "Elaine", "Danica",
            "Bryan", "Aira", "Franz", "Kevin", "Samantha",
            "Trisha", "Karl"
        ]

        # Common Filipino surnames
        surnames = [
            "Dela Cruz", "Santos", "Reyes", "Garcia", "Rodriguez",
            "Lopez", "Martinez", "Gonzales", "Perez", "Ramos",
            "Torres", "Flores", "Rivera", "Aquino", "Mendoza",
            "Castillo", "Morales", "Villanueva", "Navarro",
            "Bautista", "Domingo", "Salazar", "Padilla"
        ]

        year_levels = ["1st Year", "2nd Year", "3rd Year", "4th Year"]

        existing_sr_codes = {
            s.sr_code for s in db.query(Student.sr_code).all()
        }

        print("Generating 50 Filipino student records...")

        for _ in range(50):

            sr_code = generate_sr_code(existing_sr_codes)
            existing_sr_codes.add(sr_code)

            first_name = random.choice(first_names)

            # Middle name = mother's maiden surname
            middle_name = random.choice(surnames)

            last_name = random.choice(surnames)

            program = random.choice(programs)

            student = Student(
                sr_code=sr_code,
                first_name=first_name,
                middle_name=middle_name,
                last_name=last_name,
                program_id=program.id,
                major=program.major,
                year_level=random.choice(year_levels),
                email=f"{first_name.lower()}.{last_name.lower()}{random.randint(1,99)}@student.edu.ph",
                contact_number=f"09{random.randint(100000000, 999999999)}"
            )

            db.add(student)

        db.commit()
        print("✅ 50 students seeded successfully.")

    finally:
        db.close()


if __name__ == "__main__":
    print("=" * 60)
    print("Seeding Filipino students...")
    print("=" * 60)

    seed_students()

    print("=" * 60)
    print("Done.")
    print("=" * 60)