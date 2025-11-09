"""GitHub MCP adapter stub writing audit logs locally."""
from __future__ import annotations

import json
from datetime import datetime
from pathlib import Path
from typing import Dict, Any

USE_MOCK = True
ROOT = Path(__file__).resolve().parents[2]
AUDIT_LOG_DIR = ROOT / "audit_logs"
AUDIT_LOG_DIR.mkdir(parents=True, exist_ok=True)


def create_issue(title: str, body: str) -> Dict[str, Any]:
    if not USE_MOCK:
        raise NotImplementedError("Real MCP integration is not configured")
    timestamp = datetime.utcnow().strftime("%Y%m%dT%H%M%SZ")
    issue_id = f"ISSUE-{timestamp}"
    path = AUDIT_LOG_DIR / f"{issue_id}.md"
    path.write_text(f"# {title}\n\n{body}\n", encoding="utf-8")
    return {"issue_id": issue_id, "url": str(path)}


def append_run_log(run_id: str, manifest: Dict[str, Any]) -> Path:
    path = AUDIT_LOG_DIR / f"{run_id}.json"
    path.write_text(json.dumps(manifest, indent=2), encoding="utf-8")
    return path
