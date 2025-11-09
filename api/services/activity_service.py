"""Utility helpers for recording activity logs."""
from __future__ import annotations

from datetime import datetime
from typing import Any, Dict, Optional

from sqlalchemy.orm import Session

from ..models.audit import ActivityLog


def record_activity(session: Session, *, user_id: Optional[int], role: str, action: str, details: Dict[str, Any] | None = None, outcome: str = "success") -> ActivityLog:
    event = ActivityLog(
        user_id=user_id,
        actor_role=role,
        action=action,
        details=details or {},
        outcome=outcome,
        created_at=datetime.utcnow(),
    )
    session.add(event)
    return event
