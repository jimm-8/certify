from sqlalchemy import Boolean, Column, DateTime, Float, ForeignKey, Integer, String, Text
from sqlalchemy.sql import func

from app.database import Base


class StudentLinkedBase:
    id = Column(Integer, primary_key=True, index=True)
    sr_code = Column(String(20), ForeignKey("students.sr_code"), nullable=False, index=True)
    student_name = Column(String(255), nullable=False, index=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())


class CAVRecord(StudentLinkedBase, Base):
    __tablename__ = "cav_records"

    cav_number = Column(String(50), nullable=True)
    series = Column(String(50), nullable=True)
    date_of_issuance = Column(String(50), nullable=True)
    degree = Column(String(255), nullable=True)
    date_of_graduation = Column(String(50), nullable=True)
    institution_name = Column(String(255), nullable=True)
    address = Column(Text, nullable=True)
    requestor_name = Column(String(255), nullable=True)
    authorized_official_name = Column(String(255), nullable=True)
    processed_and_reviewed_by = Column(String(255), nullable=True)
    or_number = Column(String(50), nullable=True)
    date_issued = Column(String(50), nullable=True)
    amount = Column(Float, nullable=True)


class GraduationRecord(StudentLinkedBase, Base):
    __tablename__ = "graduation_records"

    is_graduated = Column(Boolean, default=False, nullable=False)
    program = Column(String(255), nullable=True)
    date_of_graduation = Column(String(50), nullable=True)
    board_resolution_number = Column(String(50), nullable=True)
    requestor_name = Column(String(255), nullable=True)
    semester = Column(String(50), nullable=True)
    academic_year = Column(String(50), nullable=True)
    date_of_issuance = Column(String(50), nullable=True)
    authorized_official_name = Column(String(255), nullable=True)


class EnrollmentRecord(StudentLinkedBase, Base):
    __tablename__ = "enrollment_records"

    is_current = Column(Boolean, default=True, nullable=False)
    year_level = Column(String(50), nullable=True)
    college_name = Column(String(255), nullable=True)
    semester = Column(String(50), nullable=True)
    academic_year = Column(String(50), nullable=True)
    semester_start = Column(String(50), nullable=True)
    academic_year_start = Column(String(50), nullable=True)
    semester_end = Column(String(50), nullable=True)
    academic_year_end = Column(String(50), nullable=True)
    date_of_issuance = Column(String(50), nullable=True)
    requestor_name = Column(String(255), nullable=True)
    purpose_of_request = Column(String(255), nullable=True)
    authorized_official_name = Column(String(255), nullable=True)


class EarnedUnitsRecord(StudentLinkedBase, Base):
    __tablename__ = "earned_units_records"

    credits = Column(Float, nullable=True)
    program = Column(String(255), nullable=True)
    semester_current = Column(String(50), nullable=True)
    academic_year = Column(String(50), nullable=True)
    requestor_name = Column(String(255), nullable=True)
    date_of_issuance = Column(String(50), nullable=True)
    authorized_official_name = Column(String(255), nullable=True)


class EnglishMediumRecord(StudentLinkedBase, Base):
    __tablename__ = "english_medium_records"

    has_graduated = Column(Boolean, default=False, nullable=False)
    campus_address = Column(Text, nullable=True)
    program = Column(String(255), nullable=True)
    date_of_graduation = Column(String(50), nullable=True)
    regulation = Column(String(255), nullable=True)
    requestor_name = Column(String(255), nullable=True)
    date_of_issuance = Column(String(50), nullable=True)
    authorized_official_name = Column(String(255), nullable=True)


class CompletedAcademicRequirementsRecord(StudentLinkedBase, Base):
    __tablename__ = "completed_academic_requirements_records"

    credits = Column(Float, nullable=True)
    program = Column(String(255), nullable=True)
    semester_current = Column(String(50), nullable=True)
    academic_year = Column(String(50), nullable=True)
    requestor_name = Column(String(255), nullable=True)
    date_of_issuance = Column(String(50), nullable=True)
    authorized_official_name = Column(String(255), nullable=True)


class HonorGraduateRecord(StudentLinkedBase, Base):
    __tablename__ = "honor_graduate_records"

    address = Column(Text, nullable=True)
    latin_honor = Column(String(100), nullable=True)
    program = Column(String(255), nullable=True)
    date_of_graduation = Column(String(50), nullable=True)
    board_resolution_number = Column(String(50), nullable=True)
    academic_year_when_graduated = Column(String(50), nullable=True)
    requestor_name = Column(String(255), nullable=True)
    date_of_issuance = Column(String(50), nullable=True)
    purpose_of_request = Column(String(255), nullable=True)
    authorized_official_name = Column(String(255), nullable=True)


class CourseDescriptionRecord(StudentLinkedBase, Base):
    __tablename__ = "course_description_records"

    program = Column(String(255), nullable=True)
    semester_current = Column(String(50), nullable=True)
    academic_year = Column(String(50), nullable=True)
    course_code = Column(String(50), nullable=True)
    credits = Column(Float, nullable=True)
    course_description = Column(Text, nullable=True)
    requestor_name = Column(String(255), nullable=True)
    date_of_issuance = Column(String(50), nullable=True)
    authorized_official_name = Column(String(255), nullable=True)


class IDIssuanceRecord(StudentLinkedBase, Base):
    __tablename__ = "id_issuance_records"

    is_currently_enrolled = Column(Boolean, default=True, nullable=False)
    year_attended_start = Column(String(10), nullable=True)
    year_attended_end = Column(String(10), nullable=True)
    semester_current = Column(String(50), nullable=True)
    academic_year = Column(String(50), nullable=True)
    id_number = Column(String(50), nullable=True)
    date_of_issuance = Column(String(50), nullable=True)
    requestor_name = Column(String(255), nullable=True)
    authorized_official_name = Column(String(255), nullable=True)


class NSTPSerialRecord(StudentLinkedBase, Base):
    __tablename__ = "nstp_serial_records"

    nstp_component = Column(String(100), nullable=True)
    nstp_serial_number = Column(String(100), nullable=True)
    date_of_issuance = Column(String(50), nullable=True)
    requestor_name = Column(String(255), nullable=True)
    authorized_official_name = Column(String(255), nullable=True)


class GWARecord(StudentLinkedBase, Base):
    __tablename__ = "gwa_records"

    program = Column(String(255), nullable=True)
    major = Column(String(255), nullable=True)
    board_resolution_number = Column(String(50), nullable=True)
    gwa = Column(Float, nullable=True)
    date_of_issuance = Column(String(50), nullable=True)
    requestor_name = Column(String(255), nullable=True)
    authorized_official_name = Column(String(255), nullable=True)


class TransferCredentialsRecord(StudentLinkedBase, Base):
    __tablename__ = "transfer_credentials_records"

    program = Column(String(255), nullable=True)
    date_of_issuance = Column(String(50), nullable=True)
    requestor_name = Column(String(255), nullable=True)
    authorized_official_name = Column(String(255), nullable=True)


class GradesRecord(StudentLinkedBase, Base):
    __tablename__ = "grades_records"

    program_and_college = Column(String(255), nullable=True)
    semester_and_academic_year = Column(String(100), nullable=True)
    course_code = Column(String(50), nullable=True)
    course_title = Column(String(255), nullable=True)
    units = Column(Float, nullable=True)
    grade = Column(String(10), nullable=True)
    date_of_issuance = Column(String(50), nullable=True)
    requestor_name = Column(String(255), nullable=True)
    authorized_official_name = Column(String(255), nullable=True)
