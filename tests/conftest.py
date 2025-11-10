"""Shared pytest fixtures for AudItecX tests."""
from __future__ import annotations

from pathlib import Path

import pytest


@pytest.fixture()
def temp_audit_dir(tmp_path: Path, monkeypatch: pytest.MonkeyPatch) -> Path:
    """Provide an isolated audit log directory for tests."""
    audit_dir = tmp_path / "audit_logs"
    out_dir = tmp_path / "out"
    audit_dir.mkdir(parents=True, exist_ok=True)
    out_dir.mkdir(parents=True, exist_ok=True)

    monkeypatch.setattr("src.app.AUDIT_LOG_DIR", audit_dir)
    monkeypatch.setattr("src.app.OUT_DIR", out_dir)

    return audit_dir
