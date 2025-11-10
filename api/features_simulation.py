"""Simulation feature routes for AudItecX."""
from __future__ import annotations

import json
import logging
import threading
import uuid
from pathlib import Path
from typing import Any, Dict, Iterable, List, Optional

from flask import Blueprint, Response, jsonify, request, send_file, stream_with_context
from flask.typing import ResponseReturnValue

from api.sim_helpers import (
    AUDIT_LOG_DIR,
    MOCK_SIM_ROOT,
    OUT_DIR,
    build_manifest_and_package,
    cleanup_simulation_artifacts,
    compare_with_last_run,
    emit_sse_event,
    generate_pdf_docx_report,
    generate_synthetic_docs,
    get_stream_queue,
    inject_anomalies,
    mock_policy_check,
    new_sim_run_id,
    seed_chat_timeline,
)

LOGGER = logging.getLogger("auditecx.simulation")

simulation_bp = Blueprint("simulation", __name__)


def _timestamp() -> str:
    from datetime import datetime, timezone

    return datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")


def _serialize_documents(documents: List[Any]) -> List[Dict[str, Any]]:
    payload: List[Dict[str, Any]] = []
    for doc in documents:
        if hasattr(doc, "doc_id"):
            payload.append(
                {
                    "doc_id": doc.doc_id,
                    "doc_type": doc.doc_type,
                    "amount": doc.amount,
                    "currency": doc.currency,
                    "path": str(doc.path),
                }
            )
        elif isinstance(doc, dict):
            payload.append(doc)
    return payload


def _load_previous_manifest(run_id: str) -> Optional[Dict[str, Any]]:
    manifests: List[Path] = []
    if MOCK_SIM_ROOT.exists():
        for candidate in MOCK_SIM_ROOT.iterdir():
            if candidate.is_dir() and candidate.name != run_id:
                manifest_path = candidate / "manifest.json"
                if manifest_path.exists():
                    manifests.append(manifest_path)
    if not manifests:
        return None
    manifests.sort(key=lambda path: path.stat().st_mtime, reverse=True)
    latest = manifests[0]
    try:
        return json.loads(latest.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError):
        LOGGER.warning("Failed to load previous manifest from %s", latest)
        return None


def _notifications_path() -> Path:
    AUDIT_LOG_DIR.mkdir(parents=True, exist_ok=True)
    return AUDIT_LOG_DIR / "notifications.json"


def _load_notifications() -> List[Dict[str, Any]]:
    path = _notifications_path()
    if not path.exists():
        return []
    try:
        raw = json.loads(path.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError):
        LOGGER.warning("Failed to parse notifications log at %s", path)
        return []
    if isinstance(raw, dict) and isinstance(raw.get("notifications"), list):
        payload = raw.get("notifications", [])
    else:
        payload = raw
    if not isinstance(payload, list):
        return []
    notifications: List[Dict[str, Any]] = []
    for entry in payload:
        if isinstance(entry, dict):
            notifications.append(entry)
    return notifications


def _write_notifications(notifications: Iterable[Dict[str, Any]]) -> None:
    path = _notifications_path()
    data = list(notifications)
    path.write_text(json.dumps(data, indent=2), encoding="utf-8")


def _append_notification(notification_type: str, message: str) -> None:
    payload = {
        "id": str(uuid.uuid4()),
        "type": notification_type,
        "message": message,
        "timestamp": _timestamp(),
        "read": False,
    }
    existing = _load_notifications()
    existing.append(payload)
    _write_notifications(existing)


def _log_simulation_run(run_id: str, payload: Dict[str, Any]) -> Path:
    AUDIT_LOG_DIR.mkdir(parents=True, exist_ok=True)
    path = AUDIT_LOG_DIR / f"SIM_{run_id}.json"
    path.write_text(json.dumps(payload, indent=2), encoding="utf-8")
    return path


def _simulation_worker(run_id: str, vendor_id: str, sample_size: int, anomaly_rate: float) -> Dict[str, Any]:
    queue_obj = get_stream_queue(run_id)
    emit_sse_event(run_id, "status", {"message": "Starting simulation run."})

    try:
        documents = generate_synthetic_docs(run_id, vendor_id, sample_size=sample_size)
        emit_sse_event(run_id, "documents_ready", {"count": len(documents)})

        anomalies = inject_anomalies(documents, anomaly_rate=anomaly_rate, run_id=run_id)
        emit_sse_event(run_id, "anomalies_detected", {"count": len(anomalies)})

        chat_history = seed_chat_timeline(run_id)
        emit_sse_event(run_id, "chat_seeded", {"messages": len(chat_history)})

        run_context: Dict[str, Any] = {
            "run_id": run_id,
            "vendor_id": vendor_id,
            "documents": documents,
            "anomalies": anomalies,
            "chat_history": chat_history,
            "generated_at": _timestamp(),
        }

        policy_violations = mock_policy_check(run_context)
        run_context["policy_violations"] = policy_violations
        emit_sse_event(run_id, "policy_assessed", {"count": len(policy_violations)})

        manifest_path = build_manifest_and_package(run_context)
        manifest = json.loads(manifest_path.read_text(encoding="utf-8"))
        package_path = run_context.get("package_path")
        emit_sse_event(
            run_id,
            "package_ready",
            {"path": str(package_path) if package_path else str(manifest_path)},
        )

        pdf_path, docx_path = generate_pdf_docx_report(run_context)
        emit_sse_event(
            run_id,
            "reports_ready",
            {
                "pdf": str(pdf_path),
                "docx": str(docx_path) if docx_path else None,
            },
        )

        previous_manifest = _load_previous_manifest(run_id)
        comparison = compare_with_last_run(manifest, previous_manifest)

        report_docx_val = run_context.get("report_docx_path")
        report_pdf_val = run_context.get("report_pdf_path")
        package_val = run_context.get("package_path")
        summary = {
            "run_id": run_id,
            "vendor_id": vendor_id,
            "document_count": len(documents),
            "anomaly_count": len(anomalies),
            "policy_violation_count": len(policy_violations),
            "package_path": str(package_val) if package_val else None,
            "report_pdf_path": str(report_pdf_val) if report_pdf_val else None,
            "report_docx_path": str(report_docx_val) if report_docx_val else None,
            "comparison": comparison,
            "generated_at": run_context["generated_at"],
        }

        log_payload = {
            **summary,
            "documents": _serialize_documents(documents),
            "anomalies": anomalies,
            "policy_violations": policy_violations,
            "chat_history": chat_history,
        }
        _log_simulation_run(run_id, log_payload)

        emit_sse_event(run_id, "completed", summary)
        _append_notification("simulation_complete", f"Simulation {run_id} completed for {vendor_id}.")
        if anomalies:
            _append_notification(
                "simulation_anomaly_alert",
                f"Simulation {run_id} identified {len(anomalies)} anomalies for {vendor_id}.",
            )
        if policy_violations:
            _append_notification(
                "simulation_policy_alert",
                f"Simulation {run_id} flagged {len(policy_violations)} policy items.",
            )
        return summary
    except Exception as exc:  # pragma: no cover - defensive logging
        LOGGER.exception("Simulation run %s failed", run_id)
        emit_sse_event(run_id, "error", {"message": str(exc)})
        _append_notification("simulation_error", f"Simulation {run_id} failed: {exc}")
        raise
    finally:
        queue_obj.put(None)


@simulation_bp.route("/api/simulations", methods=["POST"])
def start_simulation() -> ResponseReturnValue:
    payload = request.get_json(silent=True) or {}
    vendor_id = str(payload.get("vendor_id") or "VEND-SIM").strip() or "VEND-SIM"
    sample_size = payload.get("sample_size", 20)
    try:
        sample_size = max(1, min(int(sample_size), 200))
    except (TypeError, ValueError):
        sample_size = 20

    anomaly_rate = payload.get("anomaly_rate", 0.25)
    try:
        anomaly_rate = float(anomaly_rate)
    except (TypeError, ValueError):
        anomaly_rate = 0.25
    anomaly_rate = max(0.0, min(anomaly_rate, 1.0))

    run_id = payload.get("run_id") or new_sim_run_id()
    cleanup_simulation_artifacts(run_id)

    thread = threading.Thread(
        target=_simulation_worker,
        args=(run_id, vendor_id, sample_size, anomaly_rate),
        daemon=True,
    )
    thread.start()

    return jsonify({
        "run_id": run_id,
        "vendor_id": vendor_id,
        "sample_size": sample_size,
        "anomaly_rate": anomaly_rate,
    })


@simulation_bp.route("/api/simulations/<run_id>", methods=["GET"])
def get_simulation(run_id: str) -> ResponseReturnValue:
    path = AUDIT_LOG_DIR / f"SIM_{run_id}.json"
    if not path.exists():
        return jsonify({"error": "Simulation run not found."}), 404
    try:
        data = json.loads(path.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError):
        return jsonify({"error": "Failed to load simulation log."}), 500
    return jsonify(data)


@simulation_bp.route("/api/simulations/<run_id>/stream", methods=["GET"])
def stream_simulation(run_id: str) -> Response:
    queue_obj = get_stream_queue(run_id)

    def event_stream():
        while True:
            item = queue_obj.get()
            if item is None:
                break
            yield f"data: {json.dumps(item)}\n\n"

    response = Response(stream_with_context(event_stream()), mimetype="text/event-stream")
    response.headers["Cache-Control"] = "no-cache"
    return response


@simulation_bp.route("/api/simulations/<run_id>/package", methods=["GET"])
def download_simulation_package(run_id: str) -> ResponseReturnValue:
    package_path = OUT_DIR / f"package_SIM_{run_id}.zip"
    if not package_path.exists():
        return jsonify({"error": "Simulation package not found."}), 404
    return send_file(package_path, as_attachment=True, download_name=package_path.name)


@simulation_bp.route("/api/simulations/<run_id>/cleanup", methods=["POST"])
def cleanup_simulation(run_id: str) -> ResponseReturnValue:
    cleanup_simulation_artifacts(run_id)
    return jsonify({"run_id": run_id, "status": "deleted"})


__all__ = [
    "simulation_bp",
    "_simulation_worker",
]
