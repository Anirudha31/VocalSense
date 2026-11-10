from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from ..db import get_db
from ..models import User
from ..schemas.schemas import (
    RegisterIn,
    AuthIn,
    TokenOut,
    UserOut,
)
from ..auth import (
    hash_password,
    verify_password,
    make_token,
    current_user,
)

router = APIRouter()


@router.post(
    "/register",
    response_model=TokenOut,
    status_code=status.HTTP_201_CREATED,
)
def register(
    p: RegisterIn,
    db: Session = Depends(get_db),
):
    email = p.email.strip().lower()

    existing_user = (
        db.query(User)
        .filter(User.email == email)
        .first()
    )

    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Email already registered",
        )

    user = User(
        name=p.name.strip(),
        email=email,
        password_hash=hash_password(p.password),
    )

    try:
        db.add(user)
        db.commit()
        db.refresh(user)
    except Exception:
        db.rollback()
        raise

    return {
        "access_token": make_token(user.id),
        "user": user,
    }


@router.post(
    "/login",
    response_model=TokenOut,
)
def login(
    p: AuthIn,
    db: Session = Depends(get_db),
):
    email = p.email.strip().lower()

    user = (
        db.query(User)
        .filter(User.email == email)
        .first()
    )

    if not user or not verify_password(
        p.password,
        user.password_hash,
    ):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password",
        )

    return {
        "access_token": make_token(user.id),
        "user": user,
    }


@router.get(
    "/me",
    response_model=UserOut,
)
def me(
    user: User = Depends(current_user),
):
    return user
