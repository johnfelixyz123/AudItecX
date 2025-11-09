"""Routes exposing natural-language orchestration."""
from __future__ import annotations

import json
from typing import Any

from flask import Blueprint, Response, jsonify, request
from flask_jwt_extended import jwt_required

from ..services import orchestrator_service as orchestration

bp = Blueprint("nl", __name__, url_prefix="/api")


@bp.post("/nl_query")
@jwt_required(optional=True)
def nl_query() -> Response:
    payload = request.get_json(force=True, silent=True) or {}
    text = (payload.get("text") or "").strip()
    email = (payload.get("email") or "").strip() or None
    if not text:
        return jsonify({"error": "Missing 'text' payload"}), 400

    run = orchestration.start_run(text, email=email)
    return jsonify({
        "run_id": run["run_id"],
        "stream_url": f"/api/stream/{run['run_id']}",
        "parsed_intent": run["parsed_intent"],
    })


@bp.get("/stream/<run_id>")
@jwt_required(optional=True)
def stream(run_id: str) -> Response:
    queue = orchestration.get_queue(run_id)
    if queue is None:
        return jsonify({"error": "Unknown run"}), 404

    def event_stream():
        while True:
            item = queue.get()
            if item is None:
                yield "event: end\ndata: {}\n\n"
                break
            yield f"data: {json.dumps(item)}\n\n"

    return Response(event_stream(), mimetype="text/event-stream")


@bp.get("/download/<run_id>")
@jwt_required()
def download(run_id: str) -> Response:
    result = orchestration.get_result(run_id)
    if not result:
        return jsonify({"error": "Run not found"}), 404
    package_path = result.get("package_path")
    if not package_path:
        return jsonify({"error": "Package not ready"}), 404
    from flask import send_file

    return send_file(package_path, as_attachment=True)


@bp.post("/confirm_send")
@jwt_required()
def confirm_send() -> Response:
    payload = request.get_json(force=True, silent=True) or {}
    run_id = payload.get("run_id")
    recipient = (payload.get("email") or "").strip()
    if not run_id or not recipient:
        return jsonify({"error": "run_id and email are required"}), 400

    result = orchestration.get_result(run_id)
    if not result:
        return jsonify({"error": "Run not found"}), 404

    package_path = result.get("package_path")
    if not package_path:
        return jsonify({"error": "Package not available"}), 400

    manifest = result.get("manifest", {})
    notify = orchestration.orchestrator.notify_agent
    send_result = notify.send_package(
        run_manifest=manifest,
        recipient_email=recipient,
        attachments=[package_path],
    )

    return jsonify({"status": "sent", "details": send_result})
