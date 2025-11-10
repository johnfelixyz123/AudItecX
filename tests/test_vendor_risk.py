from __future__ import annotations

from src.app import app
from src.vendor_metrics import build_vendor_risk_metrics


def test_build_vendor_risk_metrics_calculates_scores() -> None:
    metrics = build_vendor_risk_metrics()
    vendor_106 = next((item for item in metrics if item["vendor_id"] == "VEND-106"), None)
    vendor_109 = next((item for item in metrics if item["vendor_id"] == "VEND-109"), None)

    assert vendor_106 is not None
    assert vendor_109 is not None

    assert vendor_106["anomalies"] == 2
    assert vendor_106["score"] == 80
    assert vendor_106["invoices"] >= 1

    assert vendor_109["anomalies"] == 2
    assert vendor_109["score"] == 80


def test_vendor_risk_endpoint_returns_payload() -> None:
    test_client = app.test_client()
    response = test_client.get("/api/vendors/risk")

    assert response.status_code == 200
    data = response.get_json()
    assert isinstance(data, list)
    assert any(item.get("vendor_id") == "VEND-106" for item in data if isinstance(item, dict))
