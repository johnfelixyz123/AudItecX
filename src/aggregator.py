"""Core orchestration logic for the AudItecX run."""
from __future__ import annotations

import uuid
from dataclasses import dataclass
from datetime import datetime
from pathlib import Path
from typing import Iterable, List, Optional

from src.agents.data_agent import DataAgent, LedgerEntry
from src.agents.doc_agent import DocAgent, DocumentRecord
from src.agents.match_agent import MatchAgent, MatchResult
from src.agents.notify_agent import NotifyAgent, NotificationResult
from src.agents.summary_agent import SummaryAgent, SummaryBundle
from src.mcp_adapters import vectorstore_adapter
from src.packager import Packager


@dataclass
class AggregationResult:
    run_id: str
    identifiers: List[str]
    ledger_entries: List[LedgerEntry]
    documents: List[DocumentRecord]
    matches: List[MatchResult]
    summary: SummaryBundle
    summary_path: Path
    package_path: Path
    manifest_path: Path
    notifications: NotificationResult


class Aggregator:
    """Coordinate the full audit aggregation workflow."""

    def __init__(
        self,
        doc_agent: DocAgent | None = None,
        data_agent: DataAgent | None = None,
        match_agent: MatchAgent | None = None,
        summary_agent: SummaryAgent | None = None,
        notify_agent: NotifyAgent | None = None,
        packager: Packager | None = None,
    ) -> None:
        self.doc_agent = doc_agent or DocAgent()
        self.data_agent = data_agent or DataAgent()
        self.match_agent = match_agent or MatchAgent()
        self.summary_agent = summary_agent or SummaryAgent()
        self.notify_agent = notify_agent or NotifyAgent()
        self.packager = packager or Packager()

    def run(self, identifiers: Iterable[str], notify_email: Optional[str] = None) -> AggregationResult:
        identifiers = [value.strip() for value in identifiers if value]
        run_id = datetime.utcnow().strftime("%Y%m%d%H%M%S") + "-" + uuid.uuid4().hex[:6]

        documents = self.doc_agent.gather(identifiers)
        ledger_entries = self.data_agent.lookup(identifiers)

        # Index documents in the vector store stub for future semantic search
        vectorstore_adapter.index_documents([
            {
                "manifest_ref": doc.manifest_ref,
                "text": doc.text,
                "metadata": {
                    "vendor": doc.vendor_name,
                    "invoice": doc.invoice_id,
                    "po": doc.po_id,
                    "amount": doc.amount,
                },
            }
            for doc in documents
        ])

        matches = self.match_agent.match(ledger_entries, documents)
        summary = self.summary_agent.generate(matches)
        package_locations = self.packager.create_package(run_id, summary, matches)

        manifest_snapshot = {
            "run_id": run_id,
            "identifiers": identifiers,
            "totals": summary.totals,
            "package": str(package_locations["package_path"]),
            "manifest": str(package_locations["manifest_path"]),
        }

        notifications = self.notify_agent.notify(
            run_id=run_id,
            summary_text=summary.markdown,
            manifest=manifest_snapshot,
            email=notify_email,
        )

        return AggregationResult(
            run_id=run_id,
            identifiers=identifiers,
            ledger_entries=ledger_entries,
            documents=documents,
            matches=matches,
            summary=summary,
            summary_path=package_locations["summary_path"],
            package_path=package_locations["package_path"],
            manifest_path=package_locations["manifest_path"],
            notifications=notifications,
        )


__all__ = ["Aggregator", "AggregationResult"]
