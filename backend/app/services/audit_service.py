from __future__ import annotations

from typing import Optional, Tuple

from app.database import SessionLocal
from app.models.audit_log import AuditLog
from app.repositories import AuditLogRepository, UserRepository
from app.services.auth_service import decode_access_token


def _resolve_user_from_auth_header(
    db, auth_header: Optional[str]
) -> Tuple[Optional[int], Optional[str]]:
    if not auth_header:
        return None, None
    if not auth_header.lower().startswith("bearer "):

        return None, None
    token = auth_header.split(" ", 1)[1].strip()
    if not token:
        return None, None

    data = decode_access_token(token)
    if data is None or not data.username:
        return None, None

    user_repo = UserRepository(db)
    user = user_repo.get_by_username(data.username)
    if user is None:
        return None, data.username

    return user.id, user.username


def _infer_entity_from_path(path: str) -> Tuple[str, Optional[int]]:
    parts = [p for p in path.split("/") if p]
    entity_type = "api"
    entity_id = None

    if len(parts) >= 3 and parts[0] == "api" and parts[1].startswith("v"):
        entity_type = parts[2]
        rest = parts[3:]
    elif parts:
        entity_type = parts[0]
        rest = parts[1:]
    else:
        rest = []

    for part in rest:
        if part.isdigit():
            entity_id = int(part)
            break

    return entity_type, entity_id


def log_action(
    db,
    action: str,
    entity_type: str,
    entity_id: Optional[int] = None,
    field_name: Optional[str] = None,
    old_value: Optional[str] = None,
    new_value: Optional[str] = None,
    user_id: Optional[int] = None,
    user_name: Optional[str] = None,
    notes: Optional[str] = None,
) -> AuditLog:
    audit_repo = AuditLogRepository(db)
    audit_log = AuditLog(
        action=action,
        entity_type=entity_type,
        entity_id=entity_id,
        field_name=field_name,
        old_value=old_value,
        new_value=new_value,
        user_id=user_id,
        user_name=user_name,
        notes=notes,
    )
    audit_repo.add(audit_log)
    db.commit()
    db.refresh(audit_log)
    return audit_log


def log_api_request(
    method: str, path: str, status_code: int, auth_header: Optional[str]
) -> None:
    # Fire-and-forget logging with its own session to avoid interfering with request lifecycle.
    db = SessionLocal()
    try:
        user_id, user_name = _resolve_user_from_auth_header(db, auth_header)
        entity_type, entity_id = _infer_entity_from_path(path)

        audit_repo = AuditLogRepository(db)
        audit_repo.add(
            AuditLog(
                action=f"API_{method.upper()}",
                entity_type=entity_type,
                entity_id=entity_id,
                field_name="path",
                new_value=path,
                user_id=user_id,
                user_name=user_name or "Anonymous",
                notes=f"{method.upper()} {path} -> {status_code}",
            )
        )
        db.commit()
    except Exception:
        # Never block the main request path because of audit logging failures.
        db.rollback()
    finally:
        db.close()
