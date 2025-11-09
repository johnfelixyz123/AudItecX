"""Admin user management endpoints."""
from __future__ import annotations

from flask import Blueprint, jsonify, request
from flask_jwt_extended import get_jwt, jwt_required

from ..core.database import get_db
from ..models.user import User
from ..schemas.auth import RoleLiteral
from ..services.auth_service import get_user_by_email, hash_password

bp = Blueprint("users", __name__, url_prefix="/api")


@bp.get("/users")
@jwt_required()
def list_users():
    claims = get_jwt()
    if claims.get("role") != "admin":
        return jsonify({"error": "Forbidden"}), 403
    with get_db() as session:
        users = session.query(User).order_by(User.created_at.desc()).all()
    return jsonify([
        {
            "id": user.id,
            "name": user.name,
            "email": user.email,
            "role": user.role,
            "created_at": user.created_at.isoformat() + "Z",
        }
        for user in users
    ])


@bp.post("/users")
@jwt_required()
def create_user():
    claims = get_jwt()
    if claims.get("role") != "admin":
        return jsonify({"error": "Forbidden"}), 403

    payload = request.get_json(force=True, silent=True) or {}
    name = (payload.get("name") or "").strip()
    email = (payload.get("email") or "").strip().lower()
    password = (payload.get("password") or "").strip()
    role = (payload.get("role") or "internal_auditor").strip()
    if not name or not email or not password:
        return jsonify({"error": "name, email, password required"}), 400
    if role not in {"internal_auditor", "external_auditor", "compliance_officer", "admin"}:
        return jsonify({"error": "invalid role"}), 400

    with get_db() as session:
        if get_user_by_email(session, email):
            return jsonify({"error": "User exists"}), 409
        user = User(name=name, email=email, password_hash=hash_password(password), role=role)
        session.add(user)
    return jsonify({"status": "created"}), 201


@bp.delete("/users/<int:user_id>")
@jwt_required()
def delete_user(user_id: int):
    claims = get_jwt()
    if claims.get("role") != "admin":
        return jsonify({"error": "Forbidden"}), 403
    with get_db() as session:
        user = session.get(User, user_id)
        if not user:
            return jsonify({"error": "Not found"}), 404
        session.delete(user)
    return jsonify({"status": "deleted"})
