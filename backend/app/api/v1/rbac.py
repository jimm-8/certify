from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.api.v1.auth import require_superadmin, require_permissions
from app.database import get_db
from app.models.permission import Permission
from app.models.role import Role
from app.models.role_permission import RolePermission
from app.repositories import (
    PermissionRepository,
    RolePermissionRepository,
    RoleRepository,
)
from app.schemas.rbac import PermissionResponse, RoleResponse, RolePermissionsUpdate


router = APIRouter(prefix="/rbac", tags=["rbac"])


@router.get("/permissions", response_model=list[PermissionResponse])
def list_permissions(
    db: Session = Depends(get_db),
    _: dict = Depends(require_permissions("users.manage")),
):
    perm_repo = PermissionRepository(db)
    return perm_repo.query().order_by(Permission.name).all()


@router.get("/roles", response_model=list[RoleResponse])
def list_roles(
    db: Session = Depends(get_db),
    _: dict = Depends(require_superadmin),
):
    role_repo = RoleRepository(db)
    perm_repo = PermissionRepository(db)
    role_perm_repo = RolePermissionRepository(db)

    perms_by_id = {p.id: p for p in perm_repo.query().all()}
    roles = role_repo.query().order_by(Role.name).all()
    results: list[RoleResponse] = []
    for role in roles:
        perm_ids = [rp.permission_id for rp in role_perm_repo.for_role(role.id).all()]
        perm_names = [
            perms_by_id[pid].name for pid in perm_ids if pid in perms_by_id
        ]
        results.append(
            RoleResponse(
                id=role.id,
                name=role.name,
                description=role.description,
                permissions=sorted(perm_names),
            )
        )
    return results


@router.put("/roles/{role_id}/permissions", response_model=RoleResponse)
def update_role_permissions(
    role_id: int,
    payload: RolePermissionsUpdate,
    db: Session = Depends(get_db),
    _: dict = Depends(require_superadmin),
):
    role_repo = RoleRepository(db)
    perm_repo = PermissionRepository(db)
    role_perm_repo = RolePermissionRepository(db)

    role = role_repo.get_by_id(role_id)
    if not role:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Role not found")

    requested = {p.strip() for p in payload.permissions if p and p.strip()}
    perms = perm_repo.query().filter(Permission.name.in_(requested)).all() if requested else []
    found_names = {p.name for p in perms}
    missing = sorted(requested - found_names)
    if missing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Unknown permissions: {', '.join(missing)}",
        )

    db.query(RolePermission).filter(RolePermission.role_id == role_id).delete()
    for perm in perms:
        role_perm_repo.add(RolePermission(role_id=role_id, permission_id=perm.id))
    db.commit()

    return RoleResponse(
        id=role.id,
        name=role.name,
        description=role.description,
        permissions=sorted(found_names),
    )
