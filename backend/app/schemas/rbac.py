from pydantic import BaseModel
from typing import List, Optional


class PermissionResponse(BaseModel):
    id: int
    name: str
    description: Optional[str] = None

    class Config:
        from_attributes = True


class RoleResponse(BaseModel):
    id: int
    name: str
    description: Optional[str] = None
    permissions: List[str] = []

    class Config:
        from_attributes = True


class RolePermissionsUpdate(BaseModel):
    permissions: List[str]
