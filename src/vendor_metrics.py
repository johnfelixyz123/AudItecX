"""Utility helpers for compiling vendor risk metrics from mock data."""
from __future__ import annotations

import csv
import json
import re
from collections import defaultdict
from pathlib import Path
from typing import Any, Dict, Iterable, List

ROOT = Path(__file__).resolve().parents[1]
MOCK_ROOT = ROOT / "mock_data"

DOC_PATTERN = re.compile(r"(INV-\d+|JE-\d+|PO-\d+|PAY-\d+|GRN-\d+)")


class VendorRiskError(RuntimeError):
    """Raised when vendor risk metrics cannot be computed."""


def _load_vendor_names() -> Dict[str, str]:
    vendor_file = MOCK_ROOT / "vendor_profiles.csv"
    vendor_names: Dict[str, str] = {}
    if not vendor_file.exists():
        return vendor_names

    with vendor_file.open(newline="", encoding="utf-8") as handle:
        reader = csv.DictReader(handle)
        for row in reader:
            vendor_id = (row.get("vendor_id") or "").strip()
            vendor_name = (row.get("vendor_name") or vendor_id).strip()
            if vendor_id:
                vendor_names[vendor_id] = vendor_name or vendor_id
    return vendor_names


def _load_journal_mappings() -> tuple[Dict[str, str], Dict[str, str], Dict[str, set[str]]]:
    journal_path = MOCK_ROOT / "journal_entries.csv"
    if not journal_path.exists():
        raise VendorRiskError("mock_data/journal_entries.csv is required to build vendor risk metrics")

    invoice_to_vendor: Dict[str, str] = {}
    entry_to_vendor: Dict[str, str] = {}
    vendor_to_invoices: Dict[str, set[str]] = defaultdict(set)
    po_to_vendor: Dict[str, str] = {}

    with journal_path.open(newline="", encoding="utf-8") as handle:
        reader = csv.DictReader(handle)
        for row in reader:
            vendor_id = (row.get("vendor_id") or "UNKNOWN").strip() or "UNKNOWN"
            invoice_id = (row.get("invoice_id") or "").strip()
            entry_id = (row.get("entry_id") or "").strip()
            po_id = (row.get("po_id") or "").strip()

            if invoice_id:
                invoice_to_vendor[invoice_id] = vendor_id
                vendor_to_invoices[vendor_id].add(invoice_id)
            else:
                # ensure vendor appears in result even without invoice id
                vendor_to_invoices.setdefault(vendor_id, set())

            if entry_id:
                entry_to_vendor[entry_id] = vendor_id
            if po_id:
                po_to_vendor[po_id] = vendor_id

    # Merge PO lookups into the invoice mapping so downstream resolution can reuse the same dict.
    combined_invoice_lookup = invoice_to_vendor | po_to_vendor
    return combined_invoice_lookup, entry_to_vendor, vendor_to_invoices


def _build_anomaly_counts(
    invoice_lookup: Dict[str, str],
    entry_lookup: Dict[str, str],
) -> Dict[str, int]:
    summary_path = MOCK_ROOT / "mock_data_summary.json"
    anomaly_counts: Dict[str, int] = defaultdict(int)
    if not summary_path.exists():
        return anomaly_counts

    try:
        with summary_path.open(encoding="utf-8") as handle:
            summary = json.load(handle)
    except json.JSONDecodeError as exc:
        raise VendorRiskError(f"Failed to parse {summary_path.name}: {exc}") from exc

    anomalies: Iterable[dict] = summary.get("anomalies", []) or []
    for entry in anomalies:
        doc_field = str(entry.get("doc", ""))
        vendor_id = _resolve_vendor_from_doc(doc_field, invoice_lookup, entry_lookup)
        if vendor_id:
            anomaly_counts[vendor_id] += 1

    return anomaly_counts


def _resolve_vendor_from_doc(
    doc_field: str,
    invoice_lookup: Dict[str, str],
    entry_lookup: Dict[str, str],
) -> str | None:
    tokens = DOC_PATTERN.findall(doc_field)
    for token in tokens:
        if token.startswith("INV-") and token in invoice_lookup:
            return invoice_lookup[token]
        if token.startswith("JE-") and token in entry_lookup:
            return entry_lookup[token]
        if token.startswith("PO-") and token in invoice_lookup:
            return invoice_lookup[token]
        if token.startswith("PAY-") and token in invoice_lookup:
            # Often accompanied by invoice tokens; handled by first branch when present
            continue
        if token.startswith("GRN-") and token in invoice_lookup:
            return invoice_lookup[token]
    return None


def build_vendor_risk_metrics() -> List[Dict[str, Any]]:
    """Compile per-vendor invoice counts, anomaly totals, and risk score.

    Returns a list of dictionaries sorted by descending score (highest first).
    """

    vendor_names = _load_vendor_names()
    invoice_lookup, entry_lookup, vendor_invoices = _load_journal_mappings()
    anomaly_counts = _build_anomaly_counts(invoice_lookup, entry_lookup)

    all_vendor_ids = set(vendor_invoices.keys()) | set(anomaly_counts.keys()) | set(vendor_names.keys())

    results: List[Dict[str, Any]] = []
    for vendor_id in all_vendor_ids:
        invoices = vendor_invoices.get(vendor_id, set())
        anomalies = anomaly_counts.get(vendor_id, 0)
        score = max(0, 100 - anomalies * 10)
        results.append(
            {
                "vendor_id": vendor_id,
                "vendor_name": vendor_names.get(vendor_id, vendor_id),
                "invoices": len({invoice for invoice in invoices if invoice}),
                "anomalies": anomalies,
                "score": score,
            }
        )

    results.sort(key=lambda item: (-int(item["score"]), str(item["vendor_id"])))
    return results


__all__ = ["build_vendor_risk_metrics", "VendorRiskError"]
