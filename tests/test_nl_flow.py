"""Integration tests covering NL parsing, planning, and orchestration flows."""
from __future__ import annotations

import shutil
from pathlib import Path

from src.agents import planner_agent
from src.mcp_adapters import llm_adapter
from src.nlu.intent_parser import parse_intent
from src.orchestrator import Orchestrator


def test_parse_intent_extracts_identifiers():
    llm_adapter.USE_MOCK = True

    first = parse_intent("Prepare a package for vendor VEND-100 covering invoice INV-2002.")
    assert first["entities"]["vendor_ids"] == ["VEND-100"]
    assert first["entities"]["invoice_ids"] == ["INV-2002"]

    second = parse_intent("Investigate vendor VEND-200 and invoices INV-3001, INV-3002 for anomalies.")
    assert second["entities"]["vendor_ids"] == ["VEND-200"]
    assert second["entities"]["invoice_ids"] == ["INV-3001", "INV-3002"]

    third = parse_intent("Check vend-100 and inv-2002 plus INV-2003 for potential issues.")
    assert third["entities"]["vendor_ids"] == ["VEND-100"]
    assert third["entities"]["invoice_ids"] == ["INV-2002", "INV-2003"]


def test_planner_generate_package_fallback_mapping():
    llm_adapter.USE_MOCK = True
    plan = planner_agent.plan_tasks({"intent": "generate_package"})
    tasks = [step["task"] for step in plan]
    assert tasks == [
        "doc.find_docs",
        "data.query_journal",
        "match.reconcile",
        "summary.stream_summary",
        "notify.prepare_package",
    ]


def test_orchestrator_execute_generates_outputs(tmp_path):
    llm_adapter.USE_MOCK = True
    parsed_intent = parse_intent("Prepare audit evidence for vendor VEND-100 invoice INV-2002.")

    orchestrator = Orchestrator()
    result = orchestrator.execute(parsed_intent=parsed_intent, stream_callback=lambda _: None)

    run_id = result["run_id"]
    package_path = Path(result["package_path"])
    manifest_path = Path(result["manifest_path"])

    assert package_path.exists()
    assert package_path.name == f"package_{run_id}.zip"
    assert manifest_path.exists()
    assert manifest_path.parent.name == run_id

    # Cleanup artifacts produced during the test run to keep repository tidy.
    if package_path.exists():
        package_path.unlink()
    manifest_root = manifest_path.parent
    if manifest_root.exists():
        shutil.rmtree(manifest_root, ignore_errors=True)
