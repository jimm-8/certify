from pydantic import BaseModel
from typing import Optional

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
    program: str
    major: Optional[str]
    
    class Config:
        from_attributes = True