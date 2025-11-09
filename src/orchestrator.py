"""High-level workflow orchestrator for AudItecX."""
from __future__ import annotations

import json
import logging
from datetime import datetime
from pathlib import Path
from typing import Any, Callable, Dict, Iterable, List, Optional

from src.agents import planner_agent
from src.agents.doc_agent import find_docs
from src.agents.data_agent import query_journal
from src.agents.match_agent import reconcile
from src.agents.summary_agent import SummaryAgent
from src.agents.notify_agent import NotifyAgent
from src.packager import OUT_DIR

LOGGER = logging.getLogger(__name__)


class Orchestrator:
    """Coordinate intent -> plan execution for audit aggregation."""

    def __init__(
        self,
        summary_agent: SummaryAgent | None = None,
        notify_agent: NotifyAgent | None = None,
        output_dir: Path | None = None,
    ) -> None:
        self.summary_agent = summary_agent or SummaryAgent()
        self.notify_agent = notify_agent or NotifyAgent(output_dir=output_dir)
        self.output_dir = Path(output_dir) if output_dir else OUT_DIR
        self.output_dir.mkdir(parents=True, exist_ok=True)

    def execute(
        self,
        parsed_intent: Optional[Dict[str, Any]] = None,
        plan: Optional[Iterable[Dict[str, Any]]] = None,
        stream_callback: Optional[Callable[[str], None]] = None,
        dry_run: bool = False,
        confirm_send: bool = False,  # reserved for future use
        run_id: Optional[str] = None,
    ) -> Dict[str, Any]:
        """Run the end-to-end plan and return run metadata."""
        run_id = run_id or datetime.utcnow().strftime("%Y%m%d%H%M%S")
        LOGGER.info("Starting orchestration run %s", run_id)

        if parsed_intent is None:
            parsed_intent = {"intent": "general_query", "entities": {}}

        if plan is None:
            plan = planner_agent.plan_tasks(parsed_intent or {})
        plan_list = list(plan)

        identifiers = _collect_identifiers(parsed_intent.get("entities", {}))
        context: Dict[str, Any] = {
            "run_id": run_id,
            "intent": parsed_intent,
            "plan": plan_list,
            "identifiers": identifiers,
        }

        for step in plan_list:
            task = step.get("task") or step.get("action")
            LOGGER.debug("Executing task %s", task)
            if task == "doc.find_docs" or task == "collect_documents":
                documents = find_docs(identifiers)
                context["documents"] = documents
                LOGGER.info("Found %d documents", len(documents))
            elif task == "data.query_journal":
                journal_rows = query_journal(identifiers)
                context["journal_entries"] = journal_rows
                LOGGER.info("Retrieved %d journal rows", len(journal_rows))
            elif task == "match.reconcile":
                documents = context.get("documents", [])
                journal_rows = context.get("journal_entries", [])
                matches = reconcile(documents, journal_rows)
                context["matches"] = matches.get("matches", [])
                context["anomalies"] = matches.get("anomalies", [])
                LOGGER.info("Reconciled %d matches with %d anomalies", len(context["matches"]), len(context["anomalies"]))
            elif task in {"summary.stream_summary", "summary.generate"}:
                summary_context = {
                    "documents": context.get("documents", []),
                    "journal_entries": context.get("journal_entries", []),
                    "anomalies": context.get("anomalies", []),
                }
                summary_text = self.summary_agent.stream_summary(
                    summary_context,
                    stream_callback=stream_callback or (lambda chunk: None),
                )
                context["summary_text"] = summary_text
                LOGGER.info("Summary text generated (%d chars)", len(summary_text))
            elif task in {"notify.prepare_package", "package.ensure_ready"}:
                if dry_run:
                    LOGGER.info("Dry run active, skipping package preparation")
                    continue
                package_path = self.notify_agent.prepare_package(context, run_id)
                context["package_path"] = str(package_path)
                LOGGER.info("Package prepared at %s", package_path)
            else:
                LOGGER.debug("No handler for task %s; skipping", task)

        run_dir = self.output_dir / run_id
        run_dir.mkdir(parents=True, exist_ok=True)
        manifest_data = {
            "run_id": run_id,
            "intent": parsed_intent,
            "plan": plan_list,
            "context": {
                key: value
                for key, value in context.items()
                if key not in {"plan"}
            },
            "dry_run": dry_run,
            "confirm_send": confirm_send,
        }
        manifest_path = run_dir / "manifest.json"
        manifest_path.write_text(json.dumps(manifest_data, indent=2), encoding="utf-8")
        LOGGER.info("Manifest written to %s", manifest_path)

        return {
            "run_id": run_id,
            "package_path": context.get("package_path"),
            "manifest_path": str(manifest_path),
            "manifest": manifest_data,
            "context": context,
        }


def _collect_identifiers(entities: Dict[str, Any]) -> List[str]:
    buckets = [
        entities.get("vendor_ids", []),
        entities.get("invoice_ids", []),
        entities.get("po_ids", []),
    ]
    identifiers: List[str] = []
    for bucket in buckets:
        for value in bucket or []:
            if value and value not in identifiers:
                identifiers.append(value)
    return identifiers


__all__ = ["Orchestrator"]
