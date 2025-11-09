"""Configuration helpers for the AudItecX API."""
from __future__ import annotations

import os
from functools import lru_cache
from pathlib import Path

from pydantic import BaseModel


class Settings(BaseModel):
    app_name: str = "AudItecX API"
    secret_key: str = os.getenv("AUDITECX_SECRET_KEY", "change-me")
    jwt_secret_key: str = os.getenv("AUDITECX_JWT_SECRET", "auditecx-jwt-secret")
    database_url: str = os.getenv(
        "AUDITECX_DATABASE_URL",
        f"sqlite:///{Path(__file__).resolve().parents[2] / 'auditecx.db'}",
    )
    access_token_expires_minutes: int = int(os.getenv("AUDITECX_JWT_EXPIRE_MINUTES", "60"))
    refresh_token_expires_days: int = int(os.getenv("AUDITECX_JWT_REFRESH_DAYS", "7"))
    cors_origins: str = os.getenv("AUDITECX_CORS_ORIGINS", "http://localhost:5173")
    mock_mode: bool = os.getenv("AUDITECX_USE_MOCK", "true").lower() == "true"


@lru_cache()
def get_settings() -> Settings:
    return Settings()
