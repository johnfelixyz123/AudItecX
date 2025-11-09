"""Services wrapping the legacy orchestrator for API use."""
from __future__ import annotations

import json
import logging
import queue
import threading
from datetime import datetime
from pathlib import Path
from typing import Any, Dict

from src.nlu import intent_parser
from src.agents import planner_agent
from src.orchestrator import Orchestrator

from ..core.database import get_db
from ..models.audit import AuditRun
from ..models.user import User
from .activity_service import record_activity
from .auth_service import get_user_by_email

LOGGER = logging.getLogger("auditecx.api.orchestrator")

orchestrator = Orchestrator()
RUN_QUEUES: Dict[str, "queue.Queue[Dict[str, Any] | None]"] = {}
RUN_RESULTS: Dict[str, Dict[str, Any]] = {}
RUN_LOCK = threading.Lock()


def new_run_id() -> str:
    return datetime.utcnow().strftime("%Y%m%d%H%M%S%f")


def enqueue(run_id: str, event: str, payload: Dict[str, Any]) -> None:
    with RUN_LOCK:
        q = RUN_QUEUES.get(run_id)
    if q:
        q.put({"event": event, "payload": payload})


def _worker(run_id: str, parsed_intent: Dict[str, Any], plan: Any, email: str | None) -> None:
    def stream_callback(chunk: str) -> None:
        enqueue(run_id, "summary_chunk", {"text": chunk})

    try:
        enqueue(run_id, "status", {"message": "Starting orchestration"})
        result = orchestrator.execute(
            parsed_intent=parsed_intent,
            plan=plan,
            stream_callback=stream_callback,
            run_id=run_id,
        )
        RUN_RESULTS[run_id] = result
        summary_text = result.get("context", {}).get("summary_text", "") or ""
        stats = {
            "identifiers": result.get("context", {}).get("identifiers", []),
            "anomalies": result.get("context", {}).get("anomalies", []),
        }
        with get_db() as session:
            owner = session.query(User).filter(User.email == (email or "")).one_or_none() if email else None
            audit_run = AuditRun(
                run_id=run_id,
                title=f"Audit run {run_id}",
                status="completed",
                owner_id=owner.id if owner else None,
                summary=summary_text[:1024],
                stats=stats,
                manifest_path=result.get("manifest_path"),
                package_path=result.get("package_path"),
            )
            session.add(audit_run)
        enqueue(
            run_id,
            "complete",
            {
                "package_path": result.get("package_path"),
                "manifest_path": result.get("manifest_path"),
                "manifest": result.get("manifest"),
                "email": email,
            },
        )
    except Exception as exc:  # pragma: no cover - streamed to client
        LOGGER.exception("Run %s failed", run_id)
        enqueue(run_id, "error", {"message": str(exc)})
    finally:
        with RUN_LOCK:
            queue_obj = RUN_QUEUES.pop(run_id, None)
        if queue_obj:
            queue_obj.put(None)


def start_run(nl_text: str, email: str | None = None) -> Dict[str, Any]:
    parsed_intent = intent_parser.parse_intent(nl_text, use_llm=False)
    plan = planner_agent.plan_tasks(parsed_intent)
    run_id = new_run_id()
    run_queue: "queue.Queue[Dict[str, Any] | None]" = queue.Queue()
    with RUN_LOCK:
        RUN_QUEUES[run_id] = run_queue
    with get_db() as session:
        user = get_user_by_email(session, email.lower()) if email else None  # type: ignore[arg-type]
        record_activity(
            session,
            user_id=user.id if user else None,
            role=user.role if user else "system",
            action="start_run",
            details={"run_id": run_id, "text": nl_text},
        )
    thread = threading.Thread(target=_worker, args=(run_id, parsed_intent, plan, email), daemon=True)
    thread.start()
    return {"run_id": run_id, "queue": run_queue, "parsed_intent": parsed_intent}


def get_queue(run_id: str) -> "queue.Queue[Dict[str, Any] | None] | None":
    with RUN_LOCK:
        return RUN_QUEUES.get(run_id)


def get_result(run_id: str) -> Dict[str, Any] | None:
    return RUN_RESULTS.get(run_id)
