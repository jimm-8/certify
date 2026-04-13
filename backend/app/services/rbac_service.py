from __future__ import annotations

from sqlalchemy.orm import Session

from app.models.permission import Permission
from app.models.role import Role
from app.models.role_permission import RolePermission
from app.repositories import (
    PermissionRepository,
    RolePermissionRepository,
    RoleRepository,
)


PERMISSIONS = [
    "requests.read",
    "requests.update_status",
    "requests.update_data",
    "requests.notes",
    "certificates.generate",
    "certificates.release",
    "payments.read",
    "payments.create",
    "templates.read",
    "templates.manage",
    "signatures.manage",
    "users.manage",
    "dashboard.read",
    "reports.read",
]

ROLE_PERMISSIONS = {
    "superadmin": PERMISSIONS,
    "registrar_head": [
        "requests.read",
        "requests.update_status",
        "requests.update_data",
        "requests.notes",
        "certificates.generate",
        "certificates.release",
        "payments.read",
        "payments.create",
        "templates.read",
        "templates.manage",
        "signatures.manage",
        "users.manage",
        "dashboard.read",
        "reports.read",
    ],
    "registrar_staff": [
        "requests.read",
        "requests.update_status",
        "requests.update_data",
        "requests.notes",
        "certificates.generate",
        "certificates.release",
        "payments.read",
        "templates.read",
        "dashboard.read",
        "reports.read",
    ],
    "cashier": [
        "requests.read",
        "payments.read",
        "payments.create",
    ],
}


def ensure_rbac_setup(db: Session) -> None:
    role_repo = RoleRepository(db)
    perm_repo = PermissionRepository(db)
    role_perm_repo = RolePermissionRepository(db)

    # Create permissions
    existing_perms = {p.name for p in perm_repo.query().all()}
    for perm_name in PERMISSIONS:
        if perm_name not in existing_perms:
            perm_repo.add(Permission(name=perm_name, description=perm_name))

    db.commit()

    # Create roles
    existing_roles = {r.name for r in role_repo.query().all()}
    for role_name in ROLE_PERMISSIONS.keys():
        if role_name not in existing_roles:
            role_repo.add(Role(name=role_name, description=role_name))

    db.commit()

    # Map role permissions
    perms_by_name = {p.name: p for p in perm_repo.query().all()}
    roles_by_name = {r.name: r for r in role_repo.query().all()}

    for role_name, perm_names in ROLE_PERMISSIONS.items():
        role = roles_by_name.get(role_name)
        if not role:
            continue
        existing_role_perms = {
            rp.permission_id for rp in role_perm_repo.for_role(role.id).all()
        }
        for perm_name in perm_names:
            perm = perms_by_name.get(perm_name)
            if not perm or perm.id in existing_role_perms:
                continue
            role_perm_repo.add(
                RolePermission(role_id=role.id, permission_id=perm.id)
            )

    db.commit()
