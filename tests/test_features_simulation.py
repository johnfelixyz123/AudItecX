import json
import queue
from pathlib import Path

import pytest

from api.features_simulation import _simulation_worker
from api.sim_helpers import AUDIT_LOG_DIR, cleanup_simulation_artifacts, get_stream_queue


@pytest.fixture
def sim_run_id():
    run_id = "pytest-feature-sim"
    cleanup_simulation_artifacts(run_id)
    yield run_id
    cleanup_simulation_artifacts(run_id)


@pytest.fixture(autouse=True)
def clear_notifications():
    path = AUDIT_LOG_DIR / "notifications.json"
    if path.exists():
        path.unlink()
    yield
    if path.exists():
        path.unlink()


def test_simulation_worker_creates_expected_artifacts(sim_run_id):
    vendor_id = "VEND-FEATURE"
    summary = _simulation_worker(sim_run_id, vendor_id, sample_size=4, anomaly_rate=0.5)

    assert summary["run_id"] == sim_run_id
    assert summary["vendor_id"] == vendor_id
    assert summary["document_count"] == 4
    assert summary["anomaly_count"] >= 1

    log_path = AUDIT_LOG_DIR / f"SIM_{sim_run_id}.json"
    assert log_path.exists()
    payload = json.loads(log_path.read_text(encoding="utf-8"))
    assert payload["run_id"] == sim_run_id
    assert len(payload["documents"]) == 4
    assert isinstance(payload["chat_history"], list)

    package_path = Path(summary["package_path"])
    assert package_path.exists()
    pdf_path = Path(summary["report_pdf_path"])
    assert pdf_path.exists()
    docx_path = summary.get("report_docx_path")
    if docx_path:
        assert Path(docx_path).exists()

    queue_obj = get_stream_queue(sim_run_id)
    events = []
    while True:
        try:
            item = queue_obj.get_nowait()
        except queue.Empty:
            break
        if item is None:
            continue
        events.append(item)
    assert any(event.get("event") == "completed" for event in events)

    notifications_path = AUDIT_LOG_DIR / "notifications.json"
    assert notifications_path.exists()
    notifications = json.loads(notifications_path.read_text(encoding="utf-8"))
    types = {entry.get("type") for entry in notifications if isinstance(entry, dict)}
    assert "simulation_complete" in types
    assert "simulation_anomaly_alert" in types
    assert "simulation_policy_alert" in types