from sqlalchemy import Column, DateTime, Integer, String, Text
from sqlalchemy.sql import func

from app.database import Base


class Course(Base):
    __tablename__ = "courses"

    id = Column(Integer, primary_key=True, index=True)
    course_code = Column(String(50), unique=True, nullable=False, index=True)
    course_title = Column(String(255), nullable=False)
    course_description = Column(Text, nullable=False)
    units = Column(Integer, nullable=False)
    year_level = Column(Integer, nullable=True)
    semester_offered = Column(String(10), nullable=True)
    program = Column(String(255), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
