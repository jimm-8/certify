from sqlalchemy.orm import Session

from app.database import SessionLocal
from app.models.campus import Campus


# Update these values as needed for each campus.
CAMPUS_DETAILS = {
    "Alangilan": {
        "campus_address": "Golden Country Homes, Alangilan, Batangas City, Batangas, Philippines 4200",
        "campus_telNo": "(+63 43) 425-0139 local 2149",
        "campus_email": "registrar.alangilan@g.batstate-u.edu.ph",
        "campus_certCode": "AL-CERT",
    },
    "Pablo Borbon": {
        "campus_address": "Pablo Borbon Campus, Batangas City",
        "campus_telNo": "TBD",
        "campus_email": "TBD",
        "campus_certCode": "BSU-PB",
    },
    "Lipa": {
        "campus_address": "Lipa Campus, Batangas",
        "campus_telNo": "TBD",
        "campus_email": "TBD",
        "campus_certCode": "BSU-LI",
    },
    "JPLPC": {
        "campus_address": "JPLPC Campus, Batangas",
        "campus_telNo": "TBD",
        "campus_email": "TBD",
        "campus_certCode": "BSU-JP",
    },
    "ARASOF": {
        "campus_address": "ARASOF Campus, Nasugbu, Batangas",
        "campus_telNo": "TBD",
        "campus_email": "TBD",
        "campus_certCode": "BSU-AR",
    },
    "Rosario": {
        "campus_address": "Rosario Campus, Batangas",
        "campus_telNo": "TBD",
        "campus_email": "TBD",
        "campus_certCode": "BSU-RO",
    },
    "San Juan": {
        "campus_address": "San Juan Campus, Batangas",
        "campus_telNo": "TBD",
        "campus_email": "TBD",
        "campus_certCode": "BSU-SJ",
    },
    "Lemery": {
        "campus_address": "Lemery Campus, Batangas",
        "campus_telNo": "TBD",
        "campus_email": "TBD",
        "campus_certCode": "BSU-LE",
    },
    "Balayan": {
        "campus_address": "Balayan Campus, Batangas",
        "campus_telNo": "TBD",
        "campus_email": "TBD",
        "campus_certCode": "BSU-BA",
    },
    "Mabini": {
        "campus_address": "Mabini Campus, Batangas",
        "campus_telNo": "TBD",
        "campus_email": "TBD",
        "campus_certCode": "BSU-MA",
    },
    "Lobo": {
        "campus_address": "Lobo Campus, Batangas",
        "campus_telNo": "TBD",
        "campus_email": "TBD",
        "campus_certCode": "BSU-LO",
    },
}


def seed_campus_details(db: Session) -> None:
    missing = []

    for campus_name, details in CAMPUS_DETAILS.items():
        campus = db.query(Campus).filter(Campus.name == campus_name).first()
        if not campus:
            missing.append(campus_name)
            continue

        campus.campus_address = details.get("campus_address")
        campus.campus_telNo = details.get("campus_telNo")
        campus.campus_email = details.get("campus_email")
        campus.campus_certCode = details.get("campus_certCode")
        db.add(campus)

    db.commit()

    if missing:
        print("Missing campus records:", ", ".join(missing))
    else:
        print("✅ Campus contact fields seeded successfully.")


if __name__ == "__main__":
    print("=" * 60)
    print("Seeding campus contact fields...")
    print("=" * 60)

    db = SessionLocal()
    try:
        seed_campus_details(db)
    finally:
        db.close()

    print("=" * 60)
    print("Done.")
    print("=" * 60)
