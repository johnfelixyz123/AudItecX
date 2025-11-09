"""Auth-related Pydantic schemas."""
from __future__ import annotations

from typing import Literal

from pydantic import BaseModel, EmailStr


RoleLiteral = Literal["internal_auditor", "external_auditor", "compliance_officer", "admin"]


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class TokenResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    access_expires_at: str
    refresh_expires_at: str
    user: "UserSummary"


class UserSummary(BaseModel):
    id: int
    name: str
    email: EmailStr
    role: RoleLiteral


TokenResponse.model_rebuild()