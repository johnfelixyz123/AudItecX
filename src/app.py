"""Flask UI for executing AudItecX orchestrations."""
from __future__ import annotations

import json
import logging
import queue
import threading
from datetime import datetime
from pathlib import Path
from typing import Any, Dict

from flask import Response, Flask, jsonify, render_template, request, send_file, stream_with_context

import sys

ROOT = Path(__file__).resolve().parents[1]
TEMPLATE_DIR = ROOT / "src" / "ui" / "templates"
if str(ROOT) not in sys.path:
    sys.path.append(str(ROOT))

from src.agents import planner_agent  # noqa: E402
from src.nlu import intent_parser  # noqa: E402
from src.orchestrator import Orchestrator  # noqa: E402


app = Flask(__name__, template_folder=str(TEMPLATE_DIR))
app.config["SECRET_KEY"] = "auditecx-dev"

logging.basicConfig(level=logging.INFO)
LOGGER = logging.getLogger("auditecx.app")

orchestrator = Orchestrator()
RUN_QUEUES: Dict[str, "queue.Queue[Dict[str, Any] | None]"] = {}
RUN_RESULTS: Dict[str, Dict[str, Any]] = {}
RUN_LOCK = threading.Lock()


def _new_run_id() -> str:
    return datetime.utcnow().strftime("%Y%m%d%H%M%S%f")


def _enqueue(run_id: str, event: str, payload: Dict[str, Any]) -> None:
    with RUN_LOCK:
        q = RUN_QUEUES.get(run_id)
    if q:
        q.put({"event": event, "payload": payload})


def _worker(run_id: str, parsed_intent: Dict[str, Any], plan: Any, email: str | None) -> None:
    def stream_callback(chunk: str) -> None:
        _enqueue(run_id, "summary_chunk", {"text": chunk})

    try:
        _enqueue(run_id, "status", {"message": "Starting orchestration"})
        result = orchestrator.execute(
            parsed_intent=parsed_intent,
            plan=plan,
            stream_callback=stream_callback,
            run_id=run_id,
        )
        RUN_RESULTS[run_id] = result
        package_path = result.get("package_path")
        _enqueue(
            run_id,
            "complete",
            {
                "package_path": package_path,
                "manifest_path": result.get("manifest_path"),
                "email": email,
            },
        )
    except Exception as exc:  # pragma: no cover - streamed to client
        LOGGER.exception("Run %s failed", run_id)
        _enqueue(run_id, "error", {"message": str(exc)})
    finally:
        with RUN_LOCK:
            q = RUN_QUEUES.get(run_id)
        if q:
            q.put(None)
        with RUN_LOCK:
            RUN_QUEUES.pop(run_id, None)


@app.route("/")
def index() -> str:
    return render_template("index.html")


@app.post("/api/nl_query")
def nl_query() -> Response:
    data = request.get_json(force=True, silent=True) or {}
    text = (data.get("text") or "").strip()
    email = (data.get("email") or "").strip() or None
    if not text:
        return jsonify({"error": "Missing 'text' payload"}), 400

    parsed_intent = intent_parser.parse_intent(text, use_llm=False)
    plan = planner_agent.plan_tasks(parsed_intent)

    run_id = _new_run_id()
    run_queue: "queue.Queue[Dict[str, Any] | None]" = queue.Queue()
    with RUN_LOCK:
        RUN_QUEUES[run_id] = run_queue

    thread = threading.Thread(target=_worker, args=(run_id, parsed_intent, plan, email), daemon=True)
    thread.start()

    response = {
        "run_id": run_id,
        "stream_url": f"/api/stream/{run_id}",
    }
    if email:
        response["email"] = email

    return jsonify(response)


@app.get("/api/stream/<run_id>")
def stream(run_id: str) -> Response:
    with RUN_LOCK:
        q = RUN_QUEUES.get(run_id)
    if q is None:
        return jsonify({"error": "Unknown run"}), 404

    def event_stream():
        while True:
            item = q.get()
            if item is None:
                yield "event: end\ndata: {}\n\n"
                break
            yield f"data: {json.dumps(item)}\n\n"

    return Response(stream_with_context(event_stream()), mimetype="text/event-stream")


@app.get("/api/download/<run_id>")
def download(run_id: str) -> Response:
    result = RUN_RESULTS.get(run_id)
    if not result:
        return jsonify({"error": "Run not found"}), 404
    package_path = result.get("package_path")
    if not package_path or not Path(package_path).exists():
        return jsonify({"error": "Package not available"}), 404
    return send_file(package_path, as_attachment=True)


@app.post("/api/confirm_send")
def confirm_send() -> Response:
    data = request.get_json(force=True, silent=True) or {}
    run_id = data.get("run_id")
    recipient = (data.get("email") or "").strip()
    if not run_id or not recipient:
        return jsonify({"error": "run_id and email are required"}), 400

    result = RUN_RESULTS.get(run_id)
    if not result:
        return jsonify({"error": "Run not found"}), 404

    package_path = result.get("package_path")
    if not package_path or not Path(package_path).exists():
        return jsonify({"error": "Package not available"}), 400

    manifest = result.get("manifest", {})
    notify = orchestrator.notify_agent
    send_result = notify.send_package(
        run_manifest=manifest,
        recipient_email=recipient,
        attachments=[package_path],
    )

    return jsonify({"status": "sent", "details": send_result})


if __name__ == "__main__":
    app.run(debug=True)
