"""Audit-related models."""
from __future__ import annotations

from datetime import datetime

from sqlalchemy import Column, DateTime, ForeignKey, Integer, JSON, String
from sqlalchemy.orm import relationship

from .base import Base


class AuditRun(Base):
    __tablename__ = "audit_runs"

    id = Column(Integer, primary_key=True)
    run_id = Column(String(32), unique=True, nullable=False, index=True)
    title = Column(String(255), nullable=False)
    status = Column(String(64), default="completed", nullable=False)
    owner_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    summary = Column(String(2048), nullable=True)
    stats = Column(JSON, default=dict)
    manifest_path = Column(String(512), nullable=True)
    package_path = Column(String(512), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    owner = relationship("User", backref="audit_runs")


class ActivityLog(Base):
    __tablename__ = "activity_logs"

    id = Column(Integer, primary_key=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    actor_role = Column(String(64), nullable=False)
    action = Column(String(255), nullable=False)
    details = Column(JSON, default=dict)
    outcome = Column(String(64), nullable=False, default="success")
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    user = relationship("User", backref="activity_logs")
