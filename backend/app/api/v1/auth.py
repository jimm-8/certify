from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm, OAuth2PasswordBearer
from sqlalchemy.orm import Session
from datetime import timedelta

from app.database import get_db
import json
from app.models.user import User
from app.models.permission import Permission
from app.repositories import (
    PermissionRepository,
    RolePermissionRepository,
    RoleRepository,
    UserRepository,
    UserRoleRepository,
)
from app.services.auth_service import (
    verify_password,
    create_access_token,
    decode_access_token,
    get_password_hash,
)
from app.services.audit_service import log_action
from app.schemas.user import Token, ChangePasswordRequest

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/v1/auth/token")

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/token", response_model=Token)
def login_for_access_token(form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    user_repo = UserRepository(db)
    user = user_repo.get_by_username(form_data.username)
    if not user or not verify_password(form_data.password, user.hashed_password):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Incorrect username or password")

    access_token_expires = timedelta(hours=2)
    role_name, _ = _resolve_role_and_permissions(db, user)
    access_token = create_access_token(
        data={"sub": user.username, "role": role_name},
        expires_delta=access_token_expires,
    )
    log_action(
        db,
        action="AUTH_LOGIN",
        entity_type="auth",
        entity_id=user.id,
        user_id=user.id,
        user_name=user.username,
        notes="Login success",
    )
    return {"access_token": access_token, "token_type": "bearer"}


def _resolve_role_and_permissions(db: Session, user: User):
    role_repo = RoleRepository(db)
    perm_repo = PermissionRepository(db)
    role_perm_repo = RolePermissionRepository(db)
    user_role_repo = UserRoleRepository(db)

    role_name = user.role
    role_id = user_role_repo.get_role_id_for_user(user.id)
    if role_id:
        role = role_repo.get_by_id(role_id)
        if role:
            role_name = role.name
    else:
        role = role_repo.get_by_name(user.role)
        role_id = role.id if role else None

    permissions = set()
    if role_id:
        perm_ids = [rp.permission_id for rp in role_perm_repo.for_role(role_id).all()]
        if perm_ids:
            permissions.update(
                [p.name for p in perm_repo.query().filter(Permission.id.in_(perm_ids)).all()]
            )

    # Optional user-level overrides (stored as JSON list in users.permissions)
    if user.permissions:
        try:
            extra = json.loads(user.permissions)
            if isinstance(extra, list):
                permissions.update([str(p) for p in extra])
        except Exception:
            pass

    return role_name, permissions


def get_current_user(token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)):
    data = decode_access_token(token)
    if data is None or data.username is None:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid authentication credentials")
    user_repo = UserRepository(db)
    user = user_repo.get_by_username(data.username)
    if user is None:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="User not found")
    if not user.is_active:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="User is inactive")
    role_name, permissions = _resolve_role_and_permissions(db, user)
    return {"user": user, "role": role_name, "permissions": permissions}


def require_roles(*allowed_roles: str):
    def _guard(ctx=Depends(get_current_user)):
        role = ctx["role"]
        if role not in allowed_roles:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Insufficient role")
        return ctx
    return _guard


def require_permissions(*required: str):
    def _guard(ctx=Depends(get_current_user)):
        perms = ctx["permissions"]
        if not all(p in perms for p in required):
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Missing permission")
        return ctx
    return _guard


def require_superadmin(ctx=Depends(require_roles("superadmin"))):
    return ctx


@router.post("/change-password")
def change_password(
    payload: ChangePasswordRequest,
    db: Session = Depends(get_db),
    ctx: dict = Depends(get_current_user),
):
    user = ctx["user"]
    if not verify_password(payload.current_password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Current password is incorrect",
        )
    if payload.current_password == payload.new_password:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="New password must be different from the current password",
        )
    user.hashed_password = get_password_hash(payload.new_password)
    db.add(user)
    db.commit()
    log_action(
        db,
        action="AUTH_PASSWORD_CHANGE",
        entity_type="auth",
        entity_id=user.id,
        user_id=user.id,
        user_name=user.username,
        notes="Password updated",
    )
    return {"message": "Password updated"}
