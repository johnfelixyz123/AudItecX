"""Tests for anomaly heatmap endpoint."""
from __future__ import annotations

import json
from pathlib import Path

from src.app import app


def _write_manifest(audit_dir: Path, run_id: str, anomalies: list[dict]) -> None:
    payload = {
        "run_id": run_id,
        "context": {
            "anomalies": anomalies,
            "run_id": run_id,
        },
    }
    path = audit_dir / f"{run_id}.json"
    path.write_text(json.dumps(payload), encoding="utf-8")


def test_heatmap_vendor_counts(temp_audit_dir: Path) -> None:
    _write_manifest(
        temp_audit_dir,
        "20250115010101",
        [
            {"ledger_entry": {"vendor_id": "VEND-100"}},
            {"document": {"vendor_id": "VEND-200"}},
            {"ledger_entry": {"vendor_id": "VEND-100"}},
        ],
    )
    _write_manifest(
        temp_audit_dir,
        "20250201010101",
        [
            {"ledger_entry": {"vendor_id": "VEND-300"}},
        ],
    )

    client = app.test_client()
    response = client.get("/api/vendors/heatmap?by=vendor")

    assert response.status_code == 200
    payload = response.get_json()
    assert payload["labels"] == ["VEND-100", "VEND-200", "VEND-300"]
    assert payload["values"] == [2, 1, 1]


def test_heatmap_month_counts(temp_audit_dir: Path) -> None:
    _write_manifest(
        temp_audit_dir,
        "20240131235959",
        [{"ledger_entry": {"vendor_id": "VEND-100"}}],
    )
    _write_manifest(
        temp_audit_dir,
        "20240201000000",
        [{"ledger_entry": {"vendor_id": "VEND-100"}}, {"document": {"vendor_id": "VEND-200"}}],
    )

    client = app.test_client()
    response = client.get("/api/vendors/heatmap?by=month")

    assert response.status_code == 200
    payload = response.get_json()
    assert payload["labels"] == ["2024-01", "2024-02"]
    assert payload["values"] == [1, 2]


def test_heatmap_rejects_invalid_mode(temp_audit_dir: Path) -> None:
    client = app.test_client()
    response = client.get("/api/vendors/heatmap?by=region")
    assert response.status_code == 400
    assert "error" in response.get_json()
