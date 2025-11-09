"""Application factory for the AudItecX API."""
from __future__ import annotations

import logging
import os
import sys
from datetime import timedelta
from pathlib import Path

from flask import Flask, jsonify
from flask_cors import CORS
from flask_jwt_extended import JWTManager

from .core.config import get_settings
from .core.database import engine
from .models.base import Base
from .routes import auth, insights, nl, runs, users

ROOT = Path(__file__).resolve().parents[1]
SRC_DIR = ROOT / "src"
if str(SRC_DIR) not in sys.path:
    sys.path.append(str(SRC_DIR))


def create_app() -> Flask:
    settings = get_settings()
    app = Flask(__name__)
    app.config["SECRET_KEY"] = settings.secret_key
    app.config["JWT_SECRET_KEY"] = settings.jwt_secret_key
    app.config["JWT_ACCESS_TOKEN_EXPIRES"] = timedelta(minutes=settings.access_token_expires_minutes)
    app.config["JWT_REFRESH_TOKEN_EXPIRES"] = timedelta(days=settings.refresh_token_expires_days)

    CORS(app, origins=settings.cors_origins.split(","), supports_credentials=True)

    jwt = JWTManager(app)

    @jwt.invalid_token_loader
    def invalid_token(reason):  # type: ignore[override]
        return jsonify({"error": "invalid_token", "message": reason}), 401

    @jwt.unauthorized_loader
    def missing_token(reason):  # type: ignore[override]
        return jsonify({"error": "missing_token", "message": reason}), 401

    app.register_blueprint(auth.bp)
    app.register_blueprint(insights.bp)
    app.register_blueprint(nl.bp)
    app.register_blueprint(runs.bp)
    app.register_blueprint(users.bp)

    Base.metadata.create_all(bind=engine)

    @app.get("/health")
    def health():
        return {"status": "ok"}

    return app
