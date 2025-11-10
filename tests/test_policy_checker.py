from src.policy_checker import analyze_policy_document


def test_analyze_policy_document_detects_triggers(tmp_path):
    sample_text = (
        "Payments above $25,000 require single approval by the CFO. "
        "No formal risk assessment is required for new vendors. "
        "Records may be deleted immediately after review."
    )
    policy_path = tmp_path / "policy.txt"
    policy_path.write_text(sample_text, encoding="utf-8")

    result = analyze_policy_document(policy_path, ["SOX_404", "VENDOR_RISK", "RETENTION"])

    assert result["document_name"] == policy_path.name
    assert result["controls_evaluated"] == ["SOX_404", "VENDOR_RISK", "RETENTION"]
    assert len(result["violations"]) >= 3
    severities = {violation["severity"] for violation in result["violations"]}
    assert "high" in severities
    assert "potential violation" in result["summary"]
    assert result["analysis_duration_ms"] >= 1
    assert result["metadata"]["total_tokens"] >= 10


def test_analyze_policy_document_defaults_to_all_controls(tmp_path):
    sample_text = "Least privilege is mentioned but permanent access is granted without review."
    policy_path = tmp_path / "policy.txt"
    policy_path.write_text(sample_text, encoding="utf-8")

    result = analyze_policy_document(policy_path, ["", "unknown"])

    assert "ACCESS_CONTROL" in result["controls_evaluated"]
    assert any(violation["control"] == "ACCESS_CONTROL" for violation in result["violations"])