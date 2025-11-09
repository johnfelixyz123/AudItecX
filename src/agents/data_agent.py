"""DataAgent loads deterministic mock ledger rows from CSV."""
from __future__ import annotations

import csv
from dataclasses import dataclass, asdict
from pathlib import Path
from typing import Dict, Iterable, List


ROOT = Path(__file__).resolve().parents[2]
CSV_PATH = ROOT / "mock_data" / "journal_entries.csv"


@dataclass
class LedgerEntry:
    entry_id: str
    vendor_id: str
    vendor_name: str
    invoice_id: str
    po_id: str
    amount: float
    currency: str
    status: str
    entry_date: str

    def to_dict(self) -> Dict[str, object]:
        return asdict(self)


def query_journal(identifiers: Iterable[str]) -> List[Dict[str, object]]:
    """Return ledger entries whose identifiers match the provided set."""
    id_set = {value.strip().upper() for value in identifiers if value}
    if not CSV_PATH.exists():
        return []

    matched: List[Dict[str, object]] = []
    with CSV_PATH.open("r", encoding="utf-8") as handle:
        reader = csv.DictReader(handle)
        for row in reader:
            normalized = {
                row.get("vendor_id", "").upper(),
                row.get("invoice_id", "").upper(),
                row.get("po_id", "").upper(),
            }
            if id_set and not any(token and token in id_set for token in normalized):
                continue
            matched.append(
                {
                    "entry_id": row.get("entry_id", ""),
                    "vendor_id": row.get("vendor_id", ""),
                    "vendor_name": row.get("vendor_name", ""),
                    "invoice_id": row.get("invoice_id", ""),
                    "po_id": row.get("po_id", ""),
                    "amount": float(row.get("amount", "0") or 0),
                    "currency": row.get("currency", "USD"),
                    "status": row.get("status", "recorded"),
                    "posting_date": row.get("posting_date", ""),
                }
            )
    return matched


class DataAgent:
    """Retains class interface while delegating to the CSV helper."""

    def query_journal(self, identifiers: Iterable[str]) -> List[Dict[str, object]]:
        return query_journal(identifiers)

    def lookup(self, identifiers: Iterable[str]) -> List[LedgerEntry]:
        rows = query_journal(identifiers)
        return [
            LedgerEntry(
                entry_id=row["entry_id"],
                vendor_id=row["vendor_id"],
                vendor_name=row["vendor_name"],
                invoice_id=row["invoice_id"],
                po_id=row["po_id"],
                amount=float(row["amount"]),
                currency=row["currency"],
                status=row["status"],
                entry_date=row["posting_date"],
            )
            for row in rows
        ]


__all__ = ["DataAgent", "LedgerEntry", "query_journal"]
