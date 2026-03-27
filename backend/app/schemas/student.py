from pydantic import BaseModel
from typing import Optional
from datetime import date


# Schema for program (for the datalist)
class ProgramResponse(BaseModel):
    id: int
    name: str
    code: Optional[str] = None

    class Config:
        from_attributes = True


# Schema for student (we'll use this later)
class StudentResponse(BaseModel):
    id: int
    sr_code: str
    first_name: str
    middle_name: Optional[str]
    last_name: str
    suffix: Optional[str] = None
    gender: Optional[str] = None
    birthdate: Optional[date] = None
    nationality: Optional[str] = None
    program_id: int
    campus_id: Optional[int] = None
    major: Optional[str]
    year_level: Optional[str] = None
    email: Optional[str] = None
    contact_number: Optional[str] = None

    class Config:
        from_attributes = True
