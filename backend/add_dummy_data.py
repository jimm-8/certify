from app.database import SessionLocal
from app.models.certificate_request import CertificateType
from app.models.student import Program

def add_certificate_types():
    """Add the 13 certificate types"""
    db = SessionLocal()
    
    certificate_types = [
        "Certificate of Course Description",
        "Certificate of Enrolment",
        "Certificate of Grading System",
        "Certificate of Graduation",
        "Certificate of ID Issuance",
        "Certificate of NSTP Serial Number",
        "Certification of Completed Academic Requirements",
        "Certification of Earned Units",
        "Certification of English Medium",
        "Certification of GWA",
        "Certification of Grades",
        "Certification of Honor Graduate",
        "Certification Authentication and Verification (CAV)"
    ]
    
    print("Adding certificate types...")
    for cert_name in certificate_types:
        # Check if already exists
        existing = db.query(CertificateType).filter(
            CertificateType.name == cert_name
        ).first()
        
        if not existing:
            cert_type = CertificateType(
                name=cert_name,
                description=f"Official {cert_name}",
                is_active=1
            )
            db.add(cert_type)
            print(f"  ✅ Added: {cert_name}")
        else:
            print(f"  ⏭️  Already exists: {cert_name}")
    
    db.commit()
    print("✅ Certificate types added!")
    db.close()

def add_sample_programs():
    """Add sample programs - you'll replace these with actual ones"""
    db = SessionLocal()
    
    sample_programs = [
        ("BS Computer Engineering", "BSCPE"),
        ("BS Information Technology", "BSIT"),
        ("BS Civil Engineering", "BSCE"),
        ("BS Electrical Engineering", "BSEE"),
        ("BS Mechanical Engineering", "BSME"),
        ("BS Architecture", "BSARCH"),
        ("BS Accountancy", "BSA"),
        ("BS Business Administration", "BSBA"),
    ]
    
    print("\nAdding sample programs...")
    for prog_name, prog_code in sample_programs:
        existing = db.query(Program).filter(Program.name == prog_name).first()
        
        if not existing:
            program = Program(name=prog_name, code=prog_code, is_active=1)
            db.add(program)
            print(f"  ✅ Added: {prog_name} ({prog_code})")
        else:
            print(f"  ⏭️  Already exists: {prog_name}")
    
    db.commit()
    print("✅ Sample programs added!")
    db.close()

if __name__ == "__main__":
    print("=" * 50)
    print("Adding dummy data to database...")
    print("=" * 50)
    add_certificate_types()
    add_sample_programs()
    print("\n" + "=" * 50)
    print("Done! Data added successfully!")
    print("=" * 50)

