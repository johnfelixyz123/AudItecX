import json
from datetime import datetime, timezone

from src import app as app_module


def test_scheduler_create_list_delete(temp_audit_dir):
    future_date = datetime.now(timezone.utc).replace(year=2099, month=1, day=1, hour=0, minute=0, second=0, microsecond=0)
    start_date = future_date.date().isoformat()

    with app_module.app.test_client() as client:
        create_response = client.post(
            "/api/scheduler",
            json={"vendor_id": "VEND-500", "frequency": "daily", "start_date": start_date},
        )

    assert create_response.status_code == 201
    payload = create_response.get_json() or {}
    schedule = payload.get("schedule") or {}
    assert schedule.get("vendor_id") == "VEND-500"
    assert schedule.get("frequency") == "daily"
    assert schedule.get("next_run_at")
    schedule_id = schedule.get("id")
    assert schedule_id

    with app_module.app.test_client() as client:
        list_response = client.get("/api/scheduler")

    assert list_response.status_code == 200
    listed = list_response.get_json() or {}
    schedules = listed.get("schedules") or []
    assert any(entry.get("id") == schedule_id for entry in schedules)

    schedule_path = app_module.AUDIT_LOG_DIR / "schedules.json"
    assert schedule_path.exists()
    stored = json.loads(schedule_path.read_text(encoding="utf-8"))
    assert any(entry.get("id") == schedule_id for entry in stored)

    with app_module.app.test_client() as client:
        delete_response = client.delete(f"/api/scheduler/{schedule_id}")

    assert delete_response.status_code == 204

    with app_module.app.test_client() as client:
        final_response = client.get("/api/scheduler")

    final_payload = final_response.get_json() or {}
    final_schedules = final_payload.get("schedules") or []
    assert all(entry.get("id") != schedule_id for entry in final_schedules)


def test_scheduler_rejects_invalid_frequency(temp_audit_dir):
    with app_module.app.test_client() as client:
        response = client.post(
            "/api/scheduler",
            json={"vendor_id": "VEND-600", "frequency": "hourly"},
        )

    assert response.status_code == 400
    payload = response.get_json() or {}
    assert "error" in payload
