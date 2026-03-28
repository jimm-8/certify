from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.user import User
from app.repositories import UserRepository
from app.schemas.user import UserCreate, UserResponse
from app.services.auth_service import get_password_hash
from app.api.v1.auth import require_superadmin, get_current_user

router = APIRouter(prefix="/users", tags=["users"])


@router.post("/", response_model=UserResponse)
def create_user(new_user: UserCreate, db: Session = Depends(get_db), _: User = Depends(require_superadmin)):
    # ensure username/email uniqueness
    user_repo = UserRepository(db)
    if user_repo.get_by_username(new_user.username):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Username already exists")
    if user_repo.get_by_email(new_user.email):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Email already exists")

    user = User(
        username=new_user.username,
        email=new_user.email,
        hashed_password=get_password_hash(new_user.password),
        role=new_user.role or "user",
        campus_id=new_user.campus_id,
        permissions=new_user.permissions,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


@router.get("/", response_model=list[UserResponse])
def list_users(db: Session = Depends(get_db), _: User = Depends(require_superadmin)):
    user_repo = UserRepository(db)
    users = user_repo.query().order_by(User.username).all()
    return users
