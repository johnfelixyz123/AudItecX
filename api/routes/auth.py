"""Authentication endpoints."""
from __future__ import annotations

from flask import Blueprint, jsonify, request
from flask_jwt_extended import get_jwt, get_jwt_identity, jwt_required

from ..core.database import get_db
from ..models.user import User
from ..schemas.auth import LoginRequest, TokenResponse, UserSummary
from ..services.activity_service import record_activity
from ..services.auth_service import (create_tokens, get_user_by_email,
                                     verify_password)

bp = Blueprint("auth", __name__, url_prefix="/api/auth")


@bp.post("/login")
def login():
    payload = LoginRequest.model_validate_json(request.data or b"{}")
    with get_db() as session:
        user = get_user_by_email(session, payload.email)
        if not user or not verify_password(payload.password, user.password_hash):
            return jsonify({"error": "Invalid credentials"}), 401

        claims = {"role": user.role, "name": user.name}
        tokens = create_tokens(identity=user.email, additional_claims=claims)
        record_activity(
            session,
            user_id=user.id,
            role=user.role,
            action="login",
            details={"email": user.email},
        )
        response_model = TokenResponse(
            access_token=tokens["access_token"],
            refresh_token=tokens["refresh_token"],
            access_expires_at=tokens["access_expires_at"],
            refresh_expires_at=tokens["refresh_expires_at"],
            user=UserSummary(id=user.id, name=user.name, email=user.email, role=user.role),
        )
    return jsonify(response_model.dict())


@bp.post("/refresh")
@jwt_required(refresh=True)
def refresh():
    identity = get_jwt_identity()
    claims = get_jwt()
    tokens = create_tokens(identity=identity, additional_claims=claims)
    return jsonify(tokens)


@bp.post("/logout")
@jwt_required()
def logout():
    identity = get_jwt_identity()
    with get_db() as session:
        user = get_user_by_email(session, identity)
        if user:
            record_activity(
                session,
                user_id=user.id,
                role=user.role,
                action="logout",
                details={"email": user.email},
            )
    return jsonify({"status": "logged_out"})


@bp.get("/me")
@jwt_required()
def me():
    claims = get_jwt()
    identity = get_jwt_identity()
    with get_db() as session:
        user = get_user_by_email(session, identity)
        if not user:
            return jsonify({"error": "User not found"}), 404
        return jsonify(
            UserSummary(id=user.id, name=user.name, email=user.email, role=user.role).dict()
        )
