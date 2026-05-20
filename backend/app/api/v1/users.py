from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.user import User
from app.models.user_role import UserRole
from app.repositories import RoleRepository, UserRepository, UserRoleRepository
import json
from app.schemas.user import UserAdminUpdate, UserCreate, UserResponse, UserUpdate
from app.services.auth_service import get_password_hash
from app.api.v1.auth import require_permissions, get_current_user
from sqlalchemy import func, text

router = APIRouter(prefix="/users", tags=["users"])


@router.post("/", response_model=UserResponse)
def create_user(new_user: UserCreate, db: Session = Depends(get_db), _: dict = Depends(require_permissions("users.manage"))):
    # ensure username/email uniqueness
    user_repo = UserRepository(db)
    role_repo = RoleRepository(db)
    user_role_repo = UserRoleRepository(db)
    if user_repo.get_by_username(new_user.username):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Username already exists")
    if user_repo.get_by_email(new_user.email):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Email already exists")

    role_name = new_user.role or "registrar_staff"
    permissions_payload = new_user.permissions
    permissions_value = None
    if permissions_payload:
        if isinstance(permissions_payload, list):
            permissions_value = json.dumps(permissions_payload)
        else:
            permissions_value = str(permissions_payload)
    user = User(
        username=new_user.username,
        email=new_user.email,
        hashed_password=get_password_hash(new_user.password),
        role=role_name,
        campus_id=new_user.campus_id,
        permissions=permissions_value,
        can_process_certificates=new_user.can_process_certificates,
        processing_queue_limit=max(int(new_user.processing_queue_limit or 5), 1),
        full_name=new_user.full_name,
        contact_number=new_user.contact_number,
        department=new_user.department,
    )
    user_repo.add(user)
    db.commit()
    db.refresh(user)

    role = role_repo.get_by_name(role_name)
    if role:
        user_role_repo.add(UserRole(user_id=user.id, role_id=role.id))
        db.commit()
    return user


@router.get("/", response_model=list[UserResponse])
def list_users(db: Session = Depends(get_db), _: dict = Depends(require_permissions("users.manage"))):
    user_repo = UserRepository(db)
    users = user_repo.query().order_by(User.username).all()
    queue_counts = dict(
        db.execute(
            text(
                """
                SELECT owner_username, COUNT(id)
                FROM certificate_requests
                WHERE status = 'PROCESSING' AND owner_username IS NOT NULL
                GROUP BY owner_username
                """
            )
        ).all()
    )

    return [
        UserResponse.model_validate(
            {
                **user.__dict__,
                "current_processing_queue_count": queue_counts.get(user.username, 0),
            }
        )
        for user in users
    ]


@router.put("/{user_id}", response_model=UserResponse)
def update_user(
    user_id: int,
    payload: UserAdminUpdate,
    db: Session = Depends(get_db),
    _: dict = Depends(require_permissions("users.manage")),
):
    user_repo = UserRepository(db)
    user = user_repo.get_by_id(user_id)
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")

    if payload.email and payload.email != user.email:
        existing = user_repo.get_by_email(payload.email)
        if existing and existing.id != user.id:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Email already exists",
            )
        user.email = payload.email

    if payload.role is not None:
        user.role = payload.role
    if payload.campus_id is not None:
        user.campus_id = payload.campus_id
    if payload.full_name is not None:
        user.full_name = payload.full_name
    if payload.contact_number is not None:
        user.contact_number = payload.contact_number
    if payload.department is not None:
        user.department = payload.department
    if payload.is_active is not None:
        user.is_active = payload.is_active
    if payload.can_process_certificates is not None:
        user.can_process_certificates = payload.can_process_certificates
    if payload.processing_queue_limit is not None:
        user.processing_queue_limit = max(int(payload.processing_queue_limit or 1), 1)
    if payload.permissions is not None:
        if isinstance(payload.permissions, list):
            user.permissions = json.dumps(payload.permissions)
        else:
            user.permissions = str(payload.permissions)

    db.add(user)
    db.commit()
    db.refresh(user)

    current_processing_queue_count = (
        db.execute(
            text(
                """
                SELECT COUNT(id)
                FROM certificate_requests
                WHERE status = 'PROCESSING' AND owner_username = :owner_username
                """
            ),
            {"owner_username": user.username},
        ).scalar()
        or 0
    )

    return UserResponse.model_validate(
        {
            **user.__dict__,
            "current_processing_queue_count": current_processing_queue_count,
        }
    )


@router.get("/me", response_model=UserResponse)
def get_me(ctx: dict = Depends(get_current_user)):
    return ctx["user"]


@router.put("/me", response_model=UserResponse)
def update_me(
    payload: UserUpdate,
    db: Session = Depends(get_db),
    ctx: dict = Depends(get_current_user),
):
    user = ctx["user"]
    user_repo = UserRepository(db)

    if payload.email and payload.email != user.email:
        existing = user_repo.get_by_email(payload.email)
        if existing and existing.id != user.id:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Email already exists",
            )
        user.email = payload.email

    if payload.full_name is not None:
        user.full_name = payload.full_name
    if payload.contact_number is not None:
        user.contact_number = payload.contact_number
    if payload.department is not None:
        user.department = payload.department

    db.add(user)
    db.commit()
    db.refresh(user)
    return user
