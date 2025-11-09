"""Deterministic matching between documents and journal rows."""
from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime
from typing import Dict, Iterable, List, Tuple

from src.agents.data_agent import LedgerEntry
from src.agents.doc_agent import DocumentRecord


@dataclass
class MatchResult:
    ledger_entry: LedgerEntry
    documents: List[DocumentRecord]
    score: float
    notes: List[str]


def reconcile(documents: Iterable[Dict[str, object]], journal_rows: Iterable[Dict[str, object]]) -> Dict[str, List[Dict[str, object]]]:
    """Return matches and anomalies given docs and ledger rows."""
    docs = list(documents)
    rows = list(journal_rows)
    matches: List[Dict[str, object]] = []
    anomalies: List[Dict[str, object]] = []

    for row in rows:
        linked: List[Dict[str, object]] = []
        for doc in docs:
            ok_id, id_comment = _id_match(row, doc)
            if not ok_id:
                continue
            ok_amount, amount_comment = _amount_within_tolerance(row, doc)
            ok_date, date_comment = _date_within_window(row, doc)
            rationale_parts = [note for note in [id_comment, amount_comment, date_comment] if note]
            if ok_amount and ok_date:
                linked.append({"document": doc, "rationale": rationale_parts})
            else:
                anomalies.append(
                    {
                        "ledger_entry": row,
                        "document": doc,
                        "reason": amount_comment or date_comment or "Partial match without clear reason",
                    }
                )
        if linked:
            matches.append({"ledger_entry": row, "documents": linked})
        elif not linked:
            anomalies.append({"ledger_entry": row, "document": None, "reason": "No supporting document found"})

    return {"matches": matches, "anomalies": anomalies}


class MatchAgent:
    """Provide backwards-compatible match interface while using reconcile()."""

    def match(self, ledger_entries: Iterable[LedgerEntry], documents: Iterable[DocumentRecord]) -> List[MatchResult]:
        doc_dicts = [doc.to_dict() for doc in documents]
        ledger_list = list(ledger_entries)
        ledger_dicts = []
        for entry in ledger_list:
            payload = entry.to_dict()
            payload.setdefault("posting_date", payload.pop("entry_date", ""))
            ledger_dicts.append(payload)
        outcome = reconcile(doc_dicts, ledger_dicts)
        results: List[MatchResult] = []
        index_by_id = {item["ledger_entry"]["entry_id"]: item for item in outcome["matches"]}
        anomaly_notes: Dict[str, List[str]] = {}
        for anomaly in outcome["anomalies"]:
            entry_id = str(anomaly.get("ledger_entry", {}).get("entry_id", ""))
            if not entry_id:
                continue
            anomaly_notes.setdefault(entry_id, []).append(str(anomaly.get("reason", "Unknown anomaly")))
        for entry in ledger_list:
            detail = index_by_id.get(entry.entry_id, {"documents": []})
            matched_docs: List[DocumentRecord] = []
            notes: List[str] = []
            for payload in detail.get("documents", []):
                document = _dict_to_record(payload["document"])
                matched_docs.append(document)
                notes.extend(payload.get("rationale", []))
            notes.extend(anomaly_notes.get(entry.entry_id, []))
            score = 1.0 if matched_docs else 0.0
            results.append(MatchResult(entry, matched_docs, score, notes))
        return results


def _dict_to_record(payload: Dict[str, object]) -> DocumentRecord:
    return DocumentRecord(
        filename=str(payload.get("filename", "")),
        path=str(payload.get("path", "")),
        doc_type=str(payload.get("doc_type", "")),
        vendor_id=str(payload.get("vendor_id", "")),
        vendor_name=str(payload.get("vendor_name", "")),
        invoice_id=str(payload.get("invoice_id", "")),
        po_id=str(payload.get("po_id", "")),
        date=str(payload.get("date", "")),
        amount=float(payload.get("amount", 0.0) or 0.0),
        currency=str(payload.get("currency", "USD")),
        text=str(payload.get("text", "")),
        manifest_ref=str(payload.get("manifest_ref", "")),
        extraction_confidence=float(payload.get("confidence", payload.get("extraction_confidence", 0.9)) or 0.9),
    )


def _id_match(row: Dict[str, object], doc: Dict[str, object]) -> Tuple[bool, str]:
    ledger_tokens = {
        str(row.get("vendor_id", "")).upper(),
        str(row.get("invoice_id", "")).upper(),
        str(row.get("po_id", "")).upper(),
    }
    doc_tokens = {
        str(doc.get("vendor_id", "")).upper(),
        str(doc.get("invoice_id", "")).upper(),
        str(doc.get("po_id", "")).upper(),
    }
    overlap = [token for token in doc_tokens if token and token in ledger_tokens]
    if overlap:
        return True, f"ID match on {', '.join(overlap)}"
    return False, ""


def _amount_within_tolerance(row: Dict[str, object], doc: Dict[str, object]) -> Tuple[bool, str]:
    row_amount = float(row.get("amount", 0.0) or 0.0)
    doc_amount = float(doc.get("amount", 0.0) or 0.0)
    tolerance = max(abs(row_amount) * 0.01, 0.5)
    delta = abs(row_amount - doc_amount)
    if delta <= tolerance:
        return True, f"Amount within tolerance (Δ={delta:.2f})"
    return False, f"Amount delta {delta:.2f} exceeds tolerance {tolerance:.2f}"


def _date_within_window(row: Dict[str, object], doc: Dict[str, object]) -> Tuple[bool, str]:
    ledger_date = _to_date(row.get("posting_date"))
    doc_date = _to_date(doc.get("date"))
    if not ledger_date or not doc_date:
        return True, "Date unavailable"
    gap = (ledger_date - doc_date).days
    if abs(gap) <= 7:
        return True, "Date within ±7 days"
    return False, f"Date gap {gap} days outside window"


def _to_date(value: object) -> datetime | None:
    if not value:
        return None
    text = str(value)
    for fmt in ("%Y-%m-%d", "%d-%m-%Y"):
        try:
            return datetime.strptime(text, fmt)
        except ValueError:
            continue
    return None


__all__ = ["reconcile", "MatchAgent", "MatchResult"]
