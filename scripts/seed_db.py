"""Seed the mock SQLite ledger from the CSV file."""
from __future__ import annotations

from pathlib import Path

import sys

ROOT = Path(__file__).resolve().parents[1]
if str(ROOT) not in sys.path:
    sys.path.append(str(ROOT))

from src.mcp_adapters import db_adapter  # noqa: E402


def main() -> None:
    db_adapter._bootstrap_db()  # type: ignore[attr-defined]
    print(f"Ledger bootstrapped at {db_adapter.DB_PATH}")


if __name__ == "__main__":
    main()
