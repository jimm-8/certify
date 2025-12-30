from app.database import SessionLocal
from app.models.student import Student
import random

def add_dummy_students():
    """Add dummy student records for testing"""
    db = SessionLocal()
    
    # Sample data
    first_names = ["Juan", "Maria", "Jose", "Ana", "Pedro", "Rosa", "Miguel", "Sofia", "Carlos", "Elena"]
    last_names = ["Dela Cruz", "Santos", "Reyes", "Garcia", "Rodriguez", "Lopez", "Gonzales", "Martinez", "Torres", "Ramos"]
    middle_names = ["D.", "S.", "R.", "G.", "M.", "L.", "P.", "T.", "V.", "C."]
    
    programs = [
        "BS Computer Engineering",
        "BS Information Technology",
        "BS Civil Engineering",
        "BS Electrical Engineering",
        "BS Mechanical Engineering",
        "BS Architecture",
        "BS Accountancy",
        "BS Business Administration"
    ]
    
    majors = [
        "Software Engineering",
        "Network Engineering",
        "Data Science",
        "Cybersecurity",
        None,  # Some students have no major
        None
    ]
    
    year_levels = ["1st Year", "2nd Year", "3rd Year", "4th Year", "Graduate"]
    
    print("Adding dummy students...")
    
    # Generate 20 students
    for i in range(1, 21):
        # Generate SR Code (format: YY-XXXXX)
        year = random.choice(["20", "21", "22", "23", "24"])
        sr_code = f"{year}-{i:05d}"  # e.g., 22-00001
        
        # Check if already exists
        existing = db.query(Student).filter(Student.sr_code == sr_code).first()
        if existing:
            print(f"  ⏭️  Student {sr_code} already exists")
            continue
        
        # Generate random student
        first_name = random.choice(first_names)
        last_name = random.choice(last_names)
        middle_name = random.choice(middle_names)
        program = random.choice(programs)
        major = random.choice(majors)
        year_level = random.choice(year_levels)
        
        student = Student(
            sr_code=sr_code,
            first_name=first_name,
            middle_name=middle_name,
            last_name=last_name,
            program=program,
            major=major,
            year_level=year_level,
            email=f"{first_name.lower()}.{last_name.lower()}@school.edu",
            contact_number=f"09{random.randint(100000000, 999999999)}"
        )
        
        db.add(student)
        print(f"  ✅ Added: {sr_code} - {first_name} {last_name} ({program})")
    
    db.commit()
    print("✅ Dummy students added!")
    db.close()

if __name__ == "__main__":
    print("=" * 60)
    print("Adding dummy student data...")
    print("=" * 60)
    add_dummy_students()
    print("\n" + "=" * 60)
    print("Done!")
    print("=" * 60)