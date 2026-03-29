from pydantic import BaseModel, EmailStr
from typing import Optional, Union, List
from datetime import datetime


class UserBase(BaseModel):
    username: str
    email: EmailStr
    role: Optional[str] = "user"
    campus_id: Optional[int] = None
    permissions: Optional[Union[List[str], str]] = None


class UserCreate(UserBase):
    password: str


class UserResponse(BaseModel):
    id: int
    username: str
    email: EmailStr
    role: str
    campus_id: Optional[int]
    permissions: Optional[str] = None
    created_at: Optional[datetime]

    class Config:
        from_attributes = True


class Token(BaseModel):
    access_token: str
    token_type: str


class TokenData(BaseModel):
    username: Optional[str] = None
    role: Optional[str] = None
