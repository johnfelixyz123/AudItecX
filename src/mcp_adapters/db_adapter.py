"""SQLite-backed mock adapter simulating a ledger MCP server."""
from __future__ import annotations

import csv
import sqlite3
from pathlib import Path
from typing import Iterable, List, Dict, Any, Optional

USE_MOCK = True
ROOT = Path(__file__).resolve().parents[2]
DATA_DIR = ROOT / "mock_data"
CSV_PATH = DATA_DIR / "journal_entries.csv"
DB_PATH = DATA_DIR / "journal.db"

TABLE_SQL = """
CREATE TABLE IF NOT EXISTS journal_entries (
    entry_id TEXT PRIMARY KEY,
    vendor_id TEXT,
    vendor_name TEXT,
    invoice_id TEXT,
    po_id TEXT,
    posting_date TEXT,
    amount REAL,
    currency TEXT,
    description TEXT,
    status TEXT
);
"""


def _bootstrap_db(db_path: Path = DB_PATH, csv_path: Path = CSV_PATH) -> None:
    db_path.parent.mkdir(parents=True, exist_ok=True)
    conn = sqlite3.connect(db_path)
    try:
        cur = conn.cursor()
        cur.execute(TABLE_SQL)
        conn.commit()

        cur.execute("SELECT COUNT(*) FROM journal_entries")
        count = cur.fetchone()[0]
        if count == 0 and csv_path.exists():
            with csv_path.open("r", encoding="utf-8") as fh:
                reader = csv.DictReader(fh)
                rows = [
                    (
                        row["entry_id"],
                        row["vendor_id"],
                        row.get("vendor_name", ""),
                        row["invoice_id"],
                        row["po_id"],
                        row["posting_date"],
                        float(row["amount"]),
                        row["currency"],
                        row.get("description", ""),
                        row.get("status", "recorded"),
                    )
                    for row in reader
                ]
            cur.executemany(
                "INSERT INTO journal_entries VALUES (?,?,?,?,?,?,?,?,?,?)",
                rows,
            )
            conn.commit()
    finally:
        conn.close()


class JournalDBAdapter:
    """Thin wrapper around SQLite for journal lookups."""

    def __init__(self, db_path: Path | None = None) -> None:
        if not USE_MOCK:
            raise NotImplementedError("Real MCP integration is not configured")
        self.db_path = Path(db_path) if db_path else DB_PATH
        _bootstrap_db(self.db_path)
        self._conn = sqlite3.connect(self.db_path)
        self._conn.row_factory = sqlite3.Row

    def find_by_fields(
        self,
        vendor_ids: Optional[Iterable[str]] = None,
        invoice_ids: Optional[Iterable[str]] = None,
        po_ids: Optional[Iterable[str]] = None,
    ) -> List[Dict[str, Any]]:
        clauses = []
        params: List[Any] = []

        def _build_clause(field: str, values: Iterable[str] | None) -> None:
            vals = [v for v in (values or []) if v]
            if vals:
                placeholders = ",".join(["?"] * len(vals))
                clauses.append(f"{field} IN ({placeholders})")
                params.extend(vals)

        _build_clause("vendor_id", vendor_ids)
        _build_clause("invoice_id", invoice_ids)
        _build_clause("po_id", po_ids)

        where_sql = " AND ".join(clauses) if clauses else "1=1"
        query = f"SELECT * FROM journal_entries WHERE {where_sql}"

        cur = self._conn.cursor()
        cur.execute(query, params)
        rows = cur.fetchall()
        return [dict(row) for row in rows]

    def query_by_ids(self, identifiers: Iterable[str]) -> List[Dict[str, Any]]:
        identifiers = [v for v in identifiers if v]
        if not identifiers:
            return []
        placeholders = ",".join(["?"] * len(identifiers))
        query = (
            "SELECT * FROM journal_entries WHERE vendor_id IN ({0})"
            " OR invoice_id IN ({0}) OR po_id IN ({0})"
        ).format(placeholders)
        params = list(identifiers) * 3  # reuse same IDs across vendor/invoice/po clauses
        cur = self._conn.cursor()
        cur.execute(query, params)
        rows = cur.fetchall()
        return [dict(row) for row in rows]

    def close(self) -> None:
        self._conn.close()


def get_adapter() -> JournalDBAdapter:
    return JournalDBAdapter()


__all__ = ["JournalDBAdapter", "get_adapter", "USE_MOCK", "DB_PATH"]
