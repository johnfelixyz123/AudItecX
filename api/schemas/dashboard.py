"""Dashboard payload schemas."""
from __future__ import annotations

from typing import List, Optional

from pydantic import BaseModel


class MetricTile(BaseModel):
    id: str
    label: str
    value: str
    change: str
    trend: Optional[str] = None


class InsightOfDay(BaseModel):
    message: str
    sentiment: str


class DashboardResponse(BaseModel):
    metrics: List[MetricTile]
    insight_of_day: InsightOfDay
    recent_runs: list
