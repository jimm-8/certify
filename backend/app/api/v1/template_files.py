from pathlib import Path

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session

from app.api.v1.auth import require_permissions
from app.database import get_db
from app.schemas.templates import (
    TemplateContentResponse,
    TemplateListResponse,
    TemplateUpdateRequest,
)

router = APIRouter(prefix="/templates", tags=["templates"])


def _templates_dir() -> Path:
    return Path(__file__).resolve().parents[2] / "templates"


def _templates_defaults_dir() -> Path:
    return Path(__file__).resolve().parents[2] / "templates_defaults"


def _safe_template_path(name: str) -> Path:
    if not name or ".." in name or name.startswith(("/", "\\")):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid template name")
    path = (_templates_dir() / name).resolve()
    if _templates_dir().resolve() not in path.parents:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid template path")
    return path


def _safe_template_path_in_dir(root: Path, name: str) -> Path:
    if not name or ".." in name or name.startswith(("/", "\\")):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid template name")
    path = (root / name).resolve()
    if root.resolve() not in path.parents:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid template path")
    return path


@router.get("/", response_model=TemplateListResponse)
def list_templates(
    db: Session = Depends(get_db),
    _: dict = Depends(require_permissions("templates.read")),
):
    templates_dir = _templates_dir()
    if not templates_dir.exists():
        return {"templates": []}
    names = sorted(
        [p.name for p in templates_dir.iterdir() if p.is_file() and p.suffix.lower() in {".html", ".htm"}]
    )
    return {"templates": names}


@router.get("/{template_name}", response_model=TemplateContentResponse)
def get_template(
    template_name: str,
    source: str | None = None,
    db: Session = Depends(get_db),
    _: dict = Depends(require_permissions("templates.read")),
):
    if source == "defaults":
        defaults_dir = _templates_defaults_dir()
        if not defaults_dir.exists():
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Default templates not found")
        path = _safe_template_path_in_dir(defaults_dir, template_name)
    else:
        path = _safe_template_path(template_name)
    if not path.exists() or path.suffix.lower() not in {".html", ".htm"}:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Template not found")
    content = path.read_text(encoding="utf-8")
    return {"name": path.name, "content": content}


@router.put("/{template_name}", response_model=TemplateContentResponse)
def update_template(
    template_name: str,
    payload: TemplateUpdateRequest,
    db: Session = Depends(get_db),
    _: dict = Depends(require_permissions("templates.manage")),
):
    path = _safe_template_path(template_name)
    if not path.exists() or path.suffix.lower() not in {".html", ".htm"}:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Template not found")
    path.write_text(payload.content, encoding="utf-8")
    return {"name": path.name, "content": payload.content}


@router.get("/assets/{asset_name}")
def get_template_asset(asset_name: str):
    path = _safe_template_path(asset_name)
    if not path.exists() or not path.is_file():
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Asset not found")
    return FileResponse(path)
