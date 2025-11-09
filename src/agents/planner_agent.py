"""Task planning utilities for audit workflows."""
from __future__ import annotations

import json
from typing import Any, Dict, List

try:  # pragma: no cover - optional dependency wiring
    from src.mcp_adapters import llm_adapter
except ImportError:  # pragma: no cover
    llm_adapter = None  # type: ignore

_DETERMINISTIC_FALLBACK = {
    "generate_package": [
        {"step": 1, "task": "doc.find_docs", "description": "Collect supporting documents"},
        {"step": 2, "task": "data.query_journal", "description": "Fetch ledger entries"},
        {"step": 3, "task": "match.reconcile", "description": "Reconcile documents and journal"},
        {"step": 4, "task": "summary.stream_summary", "description": "Draft auditor summary"},
        {"step": 5, "task": "notify.prepare_package", "description": "Prepare package and notifications"},
    ],
    "send_package": [
        {"step": 1, "task": "package.ensure_ready", "description": "Ensure package exists"},
        {"step": 2, "task": "notify.send_package", "description": "Deliver package to recipient"},
    ],
    "get_summary": [
        {"step": 1, "task": "summary.collect_metrics", "description": "Collect key metrics"},
        {"step": 2, "task": "summary.generate_markdown", "description": "Generate summary markdown"},
    ],
    "download_package": [
        {"step": 1, "task": "package.locate", "description": "Locate existing package"},
        {"step": 2, "task": "package.prepare_download", "description": "Provide download link"},
    ],
    "general_query": [
        {"step": 1, "task": "router.determine", "description": "Evaluate request details"},
    ],
}


def plan_tasks(parsed_intent: Dict[str, Any], use_llm: bool = False) -> List[Dict[str, Any]]:
    """Generate an execution plan from parsed intent data."""
    intent_key = (parsed_intent or {}).get("intent", "general_query")

    if use_llm and llm_adapter is not None and hasattr(llm_adapter, "plan"):
        try:
            plan_response = llm_adapter.plan(parsed_intent)
            return _normalise_plan(plan_response)
        except Exception:  # pragma: no cover - fall back to deterministic plan
            pass

    return [dict(step) for step in _DETERMINISTIC_FALLBACK.get(intent_key, _DETERMINISTIC_FALLBACK["general_query"])]


def _normalise_plan(plan_payload: Any) -> List[Dict[str, Any]]:
    """Normalise a plan payload from the adapter into a list of dict steps."""
    if isinstance(plan_payload, list):
        return [dict(step) for step in plan_payload if isinstance(step, dict)]

    if isinstance(plan_payload, str):
        try:
            parsed = json.loads(plan_payload)
        except json.JSONDecodeError:
            return _DETERMINISTIC_FALLBACK["general_query"]
        return _normalise_plan(parsed)

    if isinstance(plan_payload, dict) and "steps" in plan_payload:
        return _normalise_plan(plan_payload["steps"])

    return _DETERMINISTIC_FALLBACK["general_query"]


__all__ = ["plan_tasks"]
