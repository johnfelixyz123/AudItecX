import io

from src.app import app


def test_policy_check_endpoint_returns_analysis():
    payload = (
        b"Payments above $50,000 require single approval by the CFO. "
        b"Vendors may operate without formal risk assessments."
    )

    data = {
        "file": (io.BytesIO(payload), "policy.txt"),
        "controls": "SOX_404",
    }

    with app.test_client() as client:
        response = client.post("/api/policy/check", data=data, content_type="multipart/form-data")

    assert response.status_code == 200
    body = response.get_json()
    assert body["policy_run_id"].startswith("POLICY-")
    assert body["document_name"] == "policy.txt"
    assert body["controls_evaluated"]
    assert body["violations"]
    assert "summary" in body


def test_policy_check_endpoint_requires_file():
    with app.test_client() as client:
        response = client.post("/api/policy/check")

    assert response.status_code == 400
    assert response.get_json()["error"] == "Missing 'file' upload field"
