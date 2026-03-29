from pydantic import BaseModel
from typing import List


class TemplateListResponse(BaseModel):
    templates: List[str]


class TemplateContentResponse(BaseModel):
    name: str
    content: str


class TemplateUpdateRequest(BaseModel):
    content: str
