"""Audit run endpoints."""
from __future__ import annotations

from flask import Blueprint, jsonify
from flask_jwt_extended import get_jwt, jwt_required
from sqlalchemy import desc

from ..core.database import get_db
from ..models.audit import ActivityLog, AuditRun

bp = Blueprint("runs", __name__, url_prefix="/api")


@bp.get("/runs")
@jwt_required()
def list_runs():
    role = get_jwt().get("role", "internal_auditor")
    with get_db() as session:
        query = session.query(AuditRun)
        if role == "external_auditor":
            query = query.filter(AuditRun.status == "awaiting_review")
        runs = query.order_by(desc(AuditRun.created_at)).limit(20).all()
    return jsonify([
        {
            "id": run.id,
            "run_id": run.run_id,
            "title": run.title,
            "status": run.status,
            "summary": run.summary,
            "stats": run.stats,
            "manifest_path": run.manifest_path,
            "package_path": run.package_path,
            "created_at": run.created_at.isoformat() + "Z",
        }
        for run in runs
    ])


@bp.get("/activity")
@jwt_required()
def activity_log():
    with get_db() as session:
        events = (
            session.query(ActivityLog)
            .order_by(desc(ActivityLog.created_at))
            .limit(50)
            .all()
        )
    return jsonify([
        {
            "id": event.id,
            "user_id": event.user_id,
            "actor_role": event.actor_role,
            "action": event.action,
            "details": event.details,
            "outcome": event.outcome,
            "created_at": event.created_at.isoformat() + "Z",
        }
        for event in events
    ])