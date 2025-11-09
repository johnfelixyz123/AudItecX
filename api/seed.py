"""Seed the database with mock users and demo data."""
from __future__ import annotations

from .core.database import get_db
from .models.base import Base
from .models.user import User
from .services.auth_service import hash_password
from .core.database import engine


DEFAULT_USERS = [
    {"name": "Internal Auditor", "email": "internal@auditecx.com", "role": "internal_auditor", "password": "12345"},
    {"name": "External Auditor", "email": "external@auditecx.com", "role": "external_auditor", "password": "12345"},
    {"name": "Compliance Officer", "email": "compliance@auditecx.com", "role": "compliance_officer", "password": "12345"},
    {"name": "Admin", "email": "admin@auditecx.com", "role": "admin", "password": "12345"},
]


def seed():
    Base.metadata.create_all(bind=engine)
    with get_db() as session:
        for user in DEFAULT_USERS:
            if session.query(User).filter(User.email == user["email"]).one_or_none():
                continue
            session.add(
                User(
                    name=user["name"],
                    email=user["email"],
                    role=user["role"],
                    password_hash=hash_password(user["password"]),
                )
            )


if __name__ == "__main__":
    seed()
    print("Seed data created.")