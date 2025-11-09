"""Authentication helper services."""
from __future__ import annotations

from datetime import datetime, timedelta
from typing import Optional

from flask_jwt_extended import create_access_token, create_refresh_token
from passlib.hash import bcrypt
from sqlalchemy.orm import Session

from ..core.config import get_settings
from ..models.user import User

settings = get_settings()


def hash_password(password: str) -> str:
    return bcrypt.hash(password)


def verify_password(password: str, hashed: str) -> bool:
    return bcrypt.verify(password, hashed)


def create_tokens(identity: str, additional_claims: Optional[dict] = None) -> dict:
    access_expires = timedelta(minutes=settings.access_token_expires_minutes)
    refresh_expires = timedelta(days=settings.refresh_token_expires_days)
    access_token = create_access_token(identity=identity, additional_claims=additional_claims or {}, expires_delta=access_expires)
    refresh_token = create_refresh_token(identity=identity, additional_claims=additional_claims or {}, expires_delta=refresh_expires)
    return {
        "access_token": access_token,
        "access_expires_at": (datetime.utcnow() + access_expires).isoformat() + "Z",
        "refresh_token": refresh_token,
        "refresh_expires_at": (datetime.utcnow() + refresh_expires).isoformat() + "Z",
    }


def get_user_by_email(session: Session, email: str) -> Optional[User]:
    return session.query(User).filter(User.email == email.lower()).one_or_none()
