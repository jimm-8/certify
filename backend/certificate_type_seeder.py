from app.database import SessionLocal
from app.models.certificate_request import CertificateType


def seed_certificate_types():
    db = SessionLocal()

    certificate_types = [
        "Certificate of Course Description",
        "Certificate of Enrolment",
        "Certificate of Grading System",
        "Certificate of Graduation",
        "Certificate of ID Issuance",
        "Certificate of NSTP Serial Number",
        "Certificate of Transfer Credentials",
        "Certification of Completed Academic Requirements",
        "Certification of Earned Units",
        "Certification of English Medium",
        "Certification of GWA",
        "Certification of Grades",
        "Certification of Honor Graduate",
        "Certification Authentication and Verification (CAV)"
    ]

    print("Seeding certificate types...")

    for cert_name in certificate_types:
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
    db.close()

    print("✅ Certificate types seeded successfully.")


if __name__ == "__main__":
    print("=" * 60)
    print("Seeding Certificate Types...")
    print("=" * 60)

    seed_certificate_types()

    print("=" * 60)
    print("Done.")
    print("=" * 60)
