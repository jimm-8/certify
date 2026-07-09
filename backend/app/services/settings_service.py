from __future__ import annotations

from sqlalchemy.orm import Session
from app.models.app_setting import AppSetting


def get_setting(db: Session, key: str) -> str | None:
    row = db.query(AppSetting).filter(AppSetting.key == key).first()
    return row.value if row else None


def set_setting(db: Session, key: str, value: str | None) -> None:
    row = db.query(AppSetting).filter(AppSetting.key == key).first()
    if row:
        row.value = value
    else:
        row = AppSetting(key=key, value=value)
        db.add(row)


def get_bool_setting(db: Session, key: str, default: bool = False) -> bool:
    raw = get_setting(db, key)
    if raw is None:
        return default
    return str(raw).strip().lower() in {"1", "true", "yes", "on"}


def set_bool_setting(db: Session, key: str, value: bool) -> None:
    set_setting(db, key, "true" if value else "false")
