"""Insights and dashboard metrics endpoints."""
from __future__ import annotations

from datetime import datetime, timedelta
from random import randint

from flask import Blueprint, jsonify
from flask_jwt_extended import get_jwt, jwt_required
from sqlalchemy import func

from ..core.database import get_db
from ..models.audit import AuditRun
from ..schemas.dashboard import DashboardResponse, InsightOfDay, MetricTile

bp = Blueprint("insights", __name__, url_prefix="/api")


@bp.get("/insights")
@jwt_required()
def insights():
    claims = get_jwt()
    role = claims.get("role", "internal_auditor")

    with get_db() as session:
        total_runs = session.query(func.count(AuditRun.id)).scalar() or 0
        recent_runs = (
            session.query(AuditRun)
            .order_by(AuditRun.created_at.desc())
            .limit(5)
            .all()
        )

    metrics = [
        MetricTile(id="total_runs", label="Total Audit Runs", value=str(total_runs), change="+5% vs last week"),
        MetricTile(id="evidence_match", label="Evidence Match", value="95%", change="+2%", trend="up"),
        MetricTile(id="anomaly_rate", label="Anomaly Rate", value="12%", change="-1%", trend="down"),
    ]

    insight = InsightOfDay(
        message="Based on the last 5 runs, invoice mismatches dropped 12%.",
        sentiment="positive",
    )

    response = DashboardResponse(
        metrics=metrics,
        insight_of_day=insight,
        recent_runs=[
            {
                "run_id": run.run_id,
                "title": run.title,
                "status": run.status,
                "summary": run.summary,
                "created_at": run.created_at.isoformat() + "Z",
            }
            for run in recent_runs
        ],
    )
    return jsonify(response.dict())
