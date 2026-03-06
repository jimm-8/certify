from sqlalchemy import Column, Date, DateTime, Float, ForeignKey, Integer, String, Text
from sqlalchemy.sql import func

from app.database import Base


class StudentRecord(Base):
    __tablename__ = "student_records"

    id = Column(Integer, primary_key=True, index=True)
    student_ref_id = Column(Integer, ForeignKey("students.id"), nullable=False, index=True)
    sr_code = Column(String(20), ForeignKey("students.sr_code"), nullable=False, unique=True, index=True)
    first_name = Column(String(100), nullable=False)
    middle_name = Column(String(100), nullable=True)
    last_name = Column(String(100), nullable=False)
    sex = Column(String(20), nullable=False)
    birthdate = Column(Date, nullable=False)
    address = Column(Text, nullable=False)
    program = Column(String(255), nullable=False)
    college = Column(String(255), nullable=False)
    year_admitted = Column(Integer, nullable=False)
    expected_graduation_year = Column(Integer, nullable=False)
    status = Column(String(20), nullable=False)  # active, graduated, dropped
    created_at = Column(DateTime(timezone=True), server_default=func.now())


class CourseCatalog(Base):
    __tablename__ = "course_catalog"

    id = Column(Integer, primary_key=True, index=True)
    course_code = Column(String(50), unique=True, nullable=False, index=True)
    course_title = Column(String(255), nullable=False)
    course_description = Column(Text, nullable=False)
    units = Column(Integer, nullable=False)
    year_level = Column(Integer, nullable=False)
    semester_offered = Column(String(10), nullable=False)  # 1st, 2nd
    program = Column(String(255), nullable=False, index=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())


class Enrollment(Base):
    __tablename__ = "enrollments"

    id = Column(Integer, primary_key=True, index=True)
    student_id = Column(String(20), ForeignKey("students.sr_code"), nullable=False, index=True)
    academic_year = Column(String(20), nullable=False, index=True)
    semester = Column(String(10), nullable=False, index=True)  # 1st, 2nd
    year_level = Column(Integer, nullable=False)
    total_units = Column(Integer, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())


class EnrollmentCourse(Base):
    __tablename__ = "enrollment_courses"

    id = Column(Integer, primary_key=True, index=True)
    enrollment_id = Column(Integer, ForeignKey("enrollments.id"), nullable=False, index=True)
    course_id = Column(Integer, ForeignKey("course_catalog.id"), nullable=False, index=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())


class Grade(Base):
    __tablename__ = "grades"

    id = Column(Integer, primary_key=True, index=True)
    student_id = Column(String(20), ForeignKey("students.sr_code"), nullable=False, index=True)
    enrollment_id = Column(Integer, ForeignKey("enrollments.id"), nullable=False, index=True)
    course_id = Column(Integer, ForeignKey("course_catalog.id"), nullable=False, index=True)
    grade = Column(Float, nullable=False)
    remarks = Column(String(20), nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())


class SemesterGWA(Base):
    __tablename__ = "semester_gwa"

    id = Column(Integer, primary_key=True, index=True)
    student_id = Column(String(20), ForeignKey("students.sr_code"), nullable=False, index=True)
    academic_year = Column(String(20), nullable=False, index=True)
    semester = Column(String(10), nullable=False, index=True)
    gwa = Column(Float, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())


class Graduate(Base):
    __tablename__ = "graduates"

    id = Column(Integer, primary_key=True, index=True)
    student_id = Column(String(20), ForeignKey("students.sr_code"), nullable=False, unique=True, index=True)
    program = Column(String(255), nullable=False)
    date_of_graduation = Column(Date, nullable=False)
    board_resolution_number = Column(String(50), nullable=False)
    latin_honor = Column(String(50), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())


class NSTPRecord(Base):
    __tablename__ = "nstp_records"

    id = Column(Integer, primary_key=True, index=True)
    student_id = Column(String(20), ForeignKey("students.sr_code"), nullable=False, unique=True, index=True)
    component = Column(String(20), nullable=False)  # ROTC, CWTS, LTS
    serial_number = Column(String(100), unique=True, nullable=False, index=True)
    date_completed = Column(Date, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
