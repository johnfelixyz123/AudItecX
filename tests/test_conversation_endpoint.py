"""Tests for conversation timeline API."""
from __future__ import annotations

import json
from pathlib import Path

from src.app import app


def test_conversation_endpoint_reads_log(temp_audit_dir: Path):
    run_id = "RUN-TEST-1"
    payload = {
        "run_id": run_id,
        "messages": [
            {
                "id": "msg-1",
                "role": "user",
                "text": "Summarise vendor data",
                "timestamp": "2025-01-01T00:00:00Z",
                "keywords": ["summarise", "vendor"],
            }
        ],
        "updated_at": "2025-01-01T00:00:01Z",
    }

    path = temp_audit_dir / f"{run_id}_conversation.json"
    path.write_text(json.dumps(payload), encoding="utf-8")

    client = app.test_client()
    response = client.get(f"/api/runs/{run_id}/conversation")

    assert response.status_code == 200
    assert response.get_json() == payload


def test_conversation_endpoint_handles_missing(temp_audit_dir: Path):
    client = app.test_client()
    response = client.get("/api/runs/UNKNOWN/conversation")
    assert response.status_code == 404
    assert response.get_json()["error"] == "Conversation not found"
