import json
from pathlib import Path
from zipfile import ZipFile

import pytest

from api.sim_helpers import (
    build_manifest_and_package,
    cleanup_simulation_artifacts,
    emit_sse_event,
    generate_pdf_docx_report,
    generate_synthetic_docs,
    get_stream_queue,
    inject_anomalies,
    mock_policy_check,
)


@pytest.fixture
def run_id():
    run_id = "pytest-sim-001"
    cleanup_simulation_artifacts(run_id)
    yield run_id
    cleanup_simulation_artifacts(run_id)


@pytest.fixture
def vendor_id():
    return "VEND-PYTEST"


def test_generate_synthetic_docs_creates_expected_files(run_id, vendor_id):
    documents = generate_synthetic_docs(run_id, vendor_id, sample_size=5)
    assert len(documents) == 5
    for doc in documents:
        assert doc.path.exists()
        data = json.loads(doc.path.read_text(encoding="utf-8"))
        assert data["vendor_id"] == vendor_id
        assert data["doc_id"] == doc.doc_id


def test_manifest_and_package_contains_expected_assets(run_id, vendor_id):
    documents = generate_synthetic_docs(run_id, vendor_id, sample_size=3)
    anomalies = inject_anomalies(documents, anomaly_rate=0.5, run_id=run_id)
    run_context = {
        "run_id": run_id,
        "vendor_id": vendor_id,
        "documents": documents,
        "anomalies": anomalies,
    }
    run_context["policy_violations"] = mock_policy_check(run_context)

    manifest_path = build_manifest_and_package(run_context)
    assert manifest_path.exists()
    manifest = json.loads(manifest_path.read_text(encoding="utf-8"))
    assert manifest["run_id"] == run_id
    assert len(manifest["documents"]) == 3
    package_path: Path = run_context["package_path"]
    assert package_path.exists()
    with ZipFile(package_path) as archive:
        names = archive.namelist()
        assert any(name.endswith("manifest.json") for name in names)
        assert sum(1 for name in names if name.endswith(".txt")) == 3

    pdf_path, docx_path = generate_pdf_docx_report(run_context)
    assert pdf_path.exists()
    if docx_path is not None:
        assert docx_path.exists()


def test_emit_sse_event_populates_queue(run_id):
    queue_obj = get_stream_queue(run_id)
    assert queue_obj.empty()
    payload = {"message": "hello"}
    emit_sse_event(run_id, "status", payload)
    assert not queue_obj.empty()
    item = queue_obj.get_nowait()
    assert item["event"] == "status"
    assert item["payload"] == payload