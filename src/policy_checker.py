"""Utilities for mock AI-powered policy analysis."""
from __future__ import annotations

import re
import time
from dataclasses import dataclass
from pathlib import Path
from typing import Dict, Iterable, List, Sequence, Tuple

from src.mcp_adapters import markitdown_adapter


@dataclass(frozen=True)
class ControlDefinition:
    """Metadata describing a policy control check."""

    id: str
    label: str
    guidance: str
    required_phrases: Sequence[str]
    trigger_patterns: Sequence[Tuple[re.Pattern, str, str]]
    missing_message: str


CONTROL_CATALOG: Dict[str, ControlDefinition] = {
    "SOX_404": ControlDefinition(
        id="SOX_404",
        label="SOX 404: Control Certification",
        guidance="Policies must enforce dual approval and segregation of duties for material disbursements.",
        required_phrases=("dual approval", "segregation of duties"),
        trigger_patterns=(
            (re.compile(r"\bsingle (?:approval|sign(?:er|ature))\b", re.IGNORECASE), "Single approval detected where dual approval is required.", "high"),
            (re.compile(r"\bmanual override\b", re.IGNORECASE), "Manual override detected; ensure compensating controls exist.", "medium"),
        ),
        missing_message="Missing explicit dual-approval and segregation clauses for SOX 404 coverage.",
    ),
    "VENDOR_RISK": ControlDefinition(
        id="VENDOR_RISK",
        label="Vendor Risk: Third-Party Oversight",
        guidance="Policy should outline third-party risk scoring, onboarding reviews, and remediation cadence.",
        required_phrases=("vendor risk", "third-party"),
        trigger_patterns=(
            (re.compile(r"\bannual review\b", re.IGNORECASE), "Annual review cadence detected; ensure quarterly cadence for critical vendors.", "medium"),
            (re.compile(r"\bno (?:formal )?risk assessment\b", re.IGNORECASE), "Explicit statement that no formal risk assessment is required.", "high"),
        ),
        missing_message="Missing vendor risk program description or third-party oversight language.",
    ),
    "RETENTION": ControlDefinition(
        id="RETENTION",
        label="Record Retention",
        guidance="Policy should define retention horizons, legal hold triggers, and destruction approvals.",
        required_phrases=("retain", "year"),
        trigger_patterns=(
            (re.compile(r"\bdelete immediately\b", re.IGNORECASE), "Immediate deletion directive conflicts with retention requirements.", "high"),
            (re.compile(r"\b7\s*days\b", re.IGNORECASE), "Short retention window detected; validate against statutory minimums.", "medium"),
        ),
        missing_message="Retention durations are not documented for statutory records.",
    ),
    "ACCESS_CONTROL": ControlDefinition(
        id="ACCESS_CONTROL",
        label="Access Control & Least Privilege",
        guidance="Policy should require least privilege, periodic reviews, and revocation timelines.",
        required_phrases=("least privilege", "access review"),
        trigger_patterns=(
            (re.compile(r"\bpermanent access\b", re.IGNORECASE), "Permanent access detected; review revocation timeline.", "medium"),
            (re.compile(r"\bno approval needed\b", re.IGNORECASE), "Statement indicates access does not require approval.", "high"),
        ),
        missing_message="Least privilege or access review cadence not specified.",
    ),
}

DEFAULT_CONTROL_IDS: Tuple[str, ...] = tuple(CONTROL_CATALOG.keys())
SEVERITY_ORDER = {"high": 3, "medium": 2, "low": 1}


def analyze_policy_document(path: str | Path, controls: Iterable[str] | None = None) -> Dict[str, object]:
    """Analyze a policy document and emit deterministic mock violations."""

    start = time.perf_counter()
    source_path = Path(path)
    if not source_path.exists():
        raise FileNotFoundError(f"Policy document not found: {source_path}")

    extraction = markitdown_adapter.extract(source_path)
    text = str(extraction.get("text") or "")
    normalized = text.lower()

    selected_controls = _resolve_controls(controls)
    violations: List[Dict[str, object]] = []
    violation_index = 1

    for control_id in selected_controls:
        definition = CONTROL_CATALOG[control_id]
        missing_requirements = [phrase for phrase in definition.required_phrases if phrase.lower() not in normalized]

        if missing_requirements:
            violations.append(
                {
                    "id": f"VIOL-{violation_index:03d}",
                    "control": control_id,
                    "control_label": definition.label,
                    "statement": definition.missing_message,
                    "evidence_excerpt": _format_missing_excerpt(missing_requirements, definition.guidance),
                    "severity": "high" if len(missing_requirements) == len(definition.required_phrases) else "medium",
                    "confidence": 0.68,
                    "page": 1,
                }
            )
            violation_index += 1

        for pattern, message, severity in definition.trigger_patterns:
            match = pattern.search(text)
            if not match:
                continue
            snippet, page = _extract_snippet(text, match.start())
            violations.append(
                {
                    "id": f"VIOL-{violation_index:03d}",
                    "control": control_id,
                    "control_label": definition.label,
                    "statement": message,
                    "evidence_excerpt": snippet,
                    "severity": severity,
                    "confidence": 0.82 if severity == "high" else 0.74,
                    "page": page,
                }
            )
            violation_index += 1

    summary = _build_summary(violations)
    token_count = len(re.findall(r"\w+", text))
    duration_ms = max(int((time.perf_counter() - start) * 1000), 1)

    preview = text.strip().replace("\r", "")
    if len(preview) > 1200:
        preview = f"{preview[:1197]}…"

    return {
        "document_name": source_path.name,
        "controls_evaluated": selected_controls,
        "violations": violations,
        "summary": summary,
        "analysis_duration_ms": duration_ms,
        "metadata": {
            "pages_processed": int(extraction.get("pages") or 1),
            "total_tokens": token_count,
        },
        "document_preview": preview,
    }


def _resolve_controls(controls: Iterable[str] | None) -> List[str]:
    if controls is None:
        return list(DEFAULT_CONTROL_IDS)

    resolved = []
    for control_id in controls:
        if not control_id:
            continue
        normalized = str(control_id).strip().upper()
        if normalized in CONTROL_CATALOG and normalized not in resolved:
            resolved.append(normalized)
    if not resolved:
        return list(DEFAULT_CONTROL_IDS)
    return resolved


def _extract_snippet(text: str, index: int, window: int = 220) -> Tuple[str, int]:
    start = max(index - window // 2, 0)
    end = min(index + window // 2, len(text))
    snippet = text[start:end].strip()
    page = text.count("\f", 0, index) + 1
    return snippet, page


def _format_missing_excerpt(missing: Sequence[str], guidance: str) -> str:
    bullet = ", ".join(sorted({phrase.lower() for phrase in missing}))
    return f"Required wording absent: {bullet}. Guidance: {guidance}"


def _build_summary(violations: Sequence[Dict[str, object]]) -> str:
    if not violations:
        return "No compliance gaps detected across evaluated controls."

    severity = max((SEVERITY_ORDER.get(str(item.get("severity", "low")).lower(), 1) for item in violations), default=1)
    highest = next((label for label, rank in SEVERITY_ORDER.items() if rank == severity), "low")
    count = len(violations)
    noun = "violation" if count == 1 else "violations"
    return f"{count} potential {noun} detected; highest severity is {highest}."


__all__ = ["analyze_policy_document", "CONTROL_CATALOG", "DEFAULT_CONTROL_IDS"]
