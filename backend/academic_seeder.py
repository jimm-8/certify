from sqlalchemy.orm import Session
from app.models.college import College
from app.models.campus import Campus
from app.models.program import Program
from app.database import SessionLocal

def get_or_create(model, db: Session, **kwargs):
    instance = db.query(model).filter_by(**kwargs).first()
    if not instance:
        instance = model(**kwargs)
        db.add(instance)
        db.commit()
        db.refresh(instance)
    return instance


def create_program(db, name, code, college_id, campus_id, major=None):
    existing = db.query(Program).filter_by(
        name=name,
        major=major,
        college_id=college_id,
        campus_id=campus_id
    ).first()

    if not existing:
        db.add(Program(
            name=name,
            code=code,
            major=major,
            college_id=college_id,
            campus_id=campus_id
        ))


def seed_academics(db: Session):

    # =====================================================
    # UNIQUE CAMPUSES
    # =====================================================
    campus_names = [
        "Alangilan", "Pablo Borbon", "Lipa", "JPLPC",
        "ARASOF", "Rosario", "San Juan", "Lemery",
        "Balayan", "Mabini", "Lobo"
    ]

    campuses = {}
    for name in campus_names:
        campuses[name] = get_or_create(Campus, db, name=name)

    # =====================================================
    # COLLEGES
    # =====================================================
    colleges_data = {
        "COE": "College of Engineering",
        "CAFAD": "College of Architecture, Fine Arts and Design",
        "CAS": "College of Arts and Sciences",
        "CABEIHM": "College of Accountancy, Business, Economics and International Hospitality Management",
        "CICS": "College of Informatics and Computing Sciences",
        "CONAHS": "College of Nursing and Allied Health Sciences",
        "CET": "College of Engineering Technology",
        "CAF": "College of Agriculture and Forestry",
        "CTE": "College of Teacher Education"
    }

    colleges = {}
    for code, name in colleges_data.items():
        colleges[code] = get_or_create(College, db, name=name, code=code)

    # =====================================================
    # COE – ALANGILAN
    # =====================================================
    coe_programs = [
        ("Bachelor of Science in Chemical Engineering", "BSChE"),
        ("Bachelor of Science in Food Engineering", "BSFE"),
        ("Bachelor of Science in Ceramics Engineering", "BSCerE"),
        ("Bachelor of Science in Metallurgical Engineering", "BSMetE"),
        ("Bachelor of Science in Civil Engineering", "BSCE"),
        ("Bachelor of Science in Sanitary Engineering", "BSSE"),
        ("Bachelor of Science in Geodetic Engineering", "BSGE"),
        ("Bachelor of Science in Geological Engineering", "BSGeoE"),
        ("Bachelor of Science in Transportation Systems Engineering", "BSTE"),
        ("Bachelor of Science in Electrical Engineering", "BSEE"),
        ("Bachelor of Science in Computer Engineering", "BSCpE"),
        ("Bachelor of Science in Electronics Engineering", "BSECE"),
        ("Bachelor of Science in Instrumentation and Control Engineering", "BSICE"),
        ("Bachelor of Science in Mechatronics Engineering", "BSMexE"),
        ("Bachelor of Science in Aerospace Engineering", "BSAeE"),
        ("Bachelor of Science in Biomedical Engineering", "BSBioE"),
        ("Bachelor of Science in Industrial Engineering", "BSIE"),
        ("Bachelor of Science in Mechanical Engineering", "BSME"),
        ("Bachelor of Science in Petroleum Engineering", "BSPetE"),
        ("Bachelor of Science in Automotive Engineering", "BSAE"),
        ("Bachelor of Science in Naval Architecture and Marine Engineering", "BSNAME"),
    ]

    for name, code in coe_programs:
        create_program(db, name, code,
                       colleges["COE"].id,
                       campuses["Alangilan"].id)

    # =====================================================
    # CAFAD – ALANGILAN
    # =====================================================
    create_program(db, "Bachelor of Fine Arts and Design", "BFA",
                   colleges["CAFAD"].id,
                   campuses["Alangilan"].id,
                   major="Visual Communication")

    create_program(db, "Bachelor of Science in Architecture", "BSArch",
                   colleges["CAFAD"].id,
                   campuses["Alangilan"].id)

    create_program(db, "Bachelor of Science in Interior Design", "BSID",
                   colleges["CAFAD"].id,
                   campuses["Alangilan"].id)

    # =====================================================
    # CAS – MULTIPLE CAMPUSES
    # =====================================================
    cas_programs = [
        ("Bachelor of Arts in English Language Studies", "BAELS"),
        ("Bachelor of Arts in Communication", "BACOMM"),
        ("Bachelor of Science in Biology", "BSBIO"),
        ("Bachelor of Science in Chemistry", "BSCHEM"),
        ("Bachelor of Science in Criminology", "BSCRIM"),
        ("Bachelor of Science in Development Communication", "BSDC"),
        ("Bachelor of Science in Mathematics", "BSMATH"),
        ("Bachelor of Science in Psychology", "BSPSY"),
        ("Bachelor of Science in Fisheries and Aquatic Sciences", "BSFAS"),
    ]

    for campus in ["Pablo Borbon", "Lipa", "JPLPC", "ARASOF"]:
        for name, code in cas_programs:
            create_program(db, name, code,
                           colleges["CAS"].id,
                           campuses[campus].id)

    # =====================================================
    # CABEIHM – MULTIPLE CAMPUSES
    # =====================================================
    cabeihm_campuses = ["Pablo Borbon", "Rosario", "San Juan",
                        "Lemery", "Lipa", "JPLPC", "ARASOF"]

    for campus in cabeihm_campuses:

        create_program(db, "Bachelor of Science in Accountancy", "BSA",
                       colleges["CABEIHM"].id, campuses[campus].id)

        create_program(db, "Bachelor of Science in Business Administration", "BSBA",
                       colleges["CABEIHM"].id, campuses[campus].id,
                       major="Business Economics")

        create_program(db, "Bachelor of Science in Business Administration", "BSBA",
                       colleges["CABEIHM"].id, campuses[campus].id,
                       major="Financial Management")

        create_program(db, "Bachelor of Science in Business Administration", "BSBA",
                       colleges["CABEIHM"].id, campuses[campus].id,
                       major="Human Resource Management")

        create_program(db, "Bachelor of Science in Business Administration", "BSBA",
                       colleges["CABEIHM"].id, campuses[campus].id,
                       major="Marketing Management")

        create_program(db, "Bachelor of Science in Business Administration", "BSBA",
                       colleges["CABEIHM"].id, campuses[campus].id,
                       major="Operations Management")

        create_program(db, "Bachelor of Science in Hospitality Management", "BSHM",
                       colleges["CABEIHM"].id, campuses[campus].id)

        create_program(db, "Bachelor of Science in Tourism Management", "BSTM",
                       colleges["CABEIHM"].id, campuses[campus].id)

        create_program(db, "Bachelor in Public Administration", "BPA",
                       colleges["CABEIHM"].id, campuses[campus].id)

        create_program(db, "Bachelor of Science in Customs Administration", "BSCA",
                       colleges["CABEIHM"].id, campuses[campus].id)

        create_program(db, "Bachelor of Science in Entrepreneurship", "BSEntrep",
                       colleges["CABEIHM"].id, campuses[campus].id)

    # =====================================================
    # CICS
    # =====================================================
    for campus in ["Alangilan", "Balayan", "Mabini", "JPLPC", "ARASOF", "Lipa"]:
        create_program(db, "Bachelor of Science in Computer Science", "BSCS",
                       colleges["CICS"].id, campuses[campus].id)

        create_program(db, "Bachelor of Science in Information Technology", "BSIT",
                       colleges["CICS"].id, campuses[campus].id)

    # =====================================================
    # CONAHS
    # =====================================================
    for campus in ["Pablo Borbon", "ARASOF"]:
        create_program(db, "Bachelor of Science in Nursing", "BSN",
                       colleges["CONAHS"].id, campuses[campus].id)

        create_program(db, "Bachelor of Science in Nutrition and Dietetics", "BSND",
                       colleges["CONAHS"].id, campuses[campus].id)

        create_program(db, "Bachelor of Science in Public Health", "BSPH",
                       colleges["CONAHS"].id, campuses[campus].id,
                       major="Disaster Response")

    # =====================================================
    # CET
    # =====================================================
    cet_programs = [
        ("Bachelor of Automotive Engineering Technology", "BAET"),
        ("Bachelor of Civil Engineering Technology", "BCET"),
        ("Bachelor of Computer Engineering Technology", "BCpET"),
        ("Bachelor of Drafting Engineering Technology", "BDET"),
        ("Bachelor of Electrical Engineering Technology", "BEET"),
        ("Bachelor of Electronics Engineering Technology", "BEcET"),
        ("Bachelor of Food Engineering Technology", "BFET"),
        ("Bachelor of Instrumentation and Control Engineering Technology", "BICET"),
        ("Bachelor of Mechanical Engineering Technology", "BMET"),
        ("Bachelor of Mechatronics Engineering Technology", "BMxET"),
        ("Bachelor of Welding and Fabrication Engineering Technology", "BWFET"),
    ]

    for campus in ["Alangilan", "Balayan", "JPLPC", "Lipa"]:
        for name, code in cet_programs:
            create_program(db, name, code,
                           colleges["CET"].id,
                           campuses[campus].id)

    # =====================================================
    # CAF – LOBO
    # =====================================================
    create_program(db, "Bachelor of Science in Agriculture", "BSAgr",
                   colleges["CAF"].id, campuses["Lobo"].id)

    create_program(db, "Bachelor of Science in Forestry", "BSF",
                   colleges["CAF"].id, campuses["Lobo"].id)

    # =====================================================
    # CTE – WITH MAJORS
    # =====================================================
    for campus in ["Pablo Borbon", "Rosario", "San Juan",
                   "Lemery", "JPLPC", "ARASOF", "Lipa"]:

        create_program(db, "Bachelor of Elementary Education", "BEEd",
                       colleges["CTE"].id, campuses[campus].id)

        create_program(db, "Bachelor of Early Childhood Education", "BECEd",
                       colleges["CTE"].id, campuses[campus].id)

        # Secondary Education majors
        for major in ["Science", "English", "Filipino",
                      "Mathematics", "Social Studies"]:
            create_program(db, "Bachelor of Secondary Education", "BSEd",
                           colleges["CTE"].id, campuses[campus].id,
                           major=major)

        create_program(db, "Bachelor of Technology & Livelihood Education", "BTLEd",
                       colleges["CTE"].id, campuses[campus].id,
                       major="Home Economics")

        create_program(db, "Bachelor of Technical-Vocational Teacher Education", "BTVTEd",
                       colleges["CTE"].id, campuses[campus].id,
                       major="Garments, Fashion and Design")

        create_program(db, "Bachelor of Technical-Vocational Teacher Education", "BTVTEd",
                       colleges["CTE"].id, campuses[campus].id,
                       major="Electronics Technology")

        create_program(db, "Bachelor of Physical Education", "BPEd",
                       colleges["CTE"].id, campuses[campus].id)

    db.commit()
    print("✅ ALL colleges, campuses, programs, and majors seeded successfully.")

if __name__ == "__main__":
    print("=" * 60)
    print("Seeding academic data...")
    print("=" * 60)

    db = SessionLocal()
    try:
        seed_academics(db)
    finally:
        db.close()

    print("=" * 60)
    print("Done.")
    print("=" * 60)