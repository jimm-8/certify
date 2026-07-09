from sqlalchemy import Column, DateTime, ForeignKey, Integer, String
from sqlalchemy.sql import func

from app.database import Base


class CurriculumCourse(Base):
    __tablename__ = "curriculum_courses"

    id = Column(Integer, primary_key=True, index=True)
    curriculum_id = Column(Integer, ForeignKey("curriculums.id"), nullable=False, index=True)
    course_id = Column(Integer, ForeignKey("courses.id"), nullable=False, index=True)
    year_level = Column(Integer, nullable=True)
    semester = Column(String(10), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
