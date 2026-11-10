from datetime import datetime, timedelta, timezone

from jose import jwt, JWTError
from passlib.context import CryptContext

from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.orm import Session

from .config import settings
from .db import get_db
from .models import User


pwd = CryptContext(
    schemes=["bcrypt"],
    deprecated="auto",
)

oauth = OAuth2PasswordBearer(
    tokenUrl="/api/auth/login",
)


def hash_password(password: str) -> str:
    return pwd.hash(password)


def verify_password(
    password: str,
    hashed_password: str,
) -> bool:
    return pwd.verify(password, hashed_password)


def make_token(user_id: int) -> str:
    expiration = (
        datetime.now(timezone.utc)
        + timedelta(minutes=settings.access_token_minutes)
    )

    payload = {
        "sub": str(user_id),
        "exp": expiration,
    }

    return jwt.encode(
        payload,
        settings.secret_key,
        algorithm="HS256",
    )


def current_user(
    token: str = Depends(oauth),
    db: Session = Depends(get_db),
) -> User:
    unauthorized = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Invalid or expired token",
        headers={"WWW-Authenticate": "Bearer"},
    )

    try:
        payload = jwt.decode(
            token,
            settings.secret_key,
            algorithms=["HS256"],
        )

        subject = payload.get("sub")

        if not isinstance(subject, str) or not subject.isdigit():
            raise unauthorized

        user_id = int(subject)

    except (JWTError, TypeError, ValueError):
        raise unauthorized

    user = db.get(User, user_id)

    if user is None:
        raise unauthorized

    return user
