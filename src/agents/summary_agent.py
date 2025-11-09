"""SummaryAgent synthesizes match results into auditor-friendly Markdown."""
from __future__ import annotations

import json
from dataclasses import dataclass, asdict
from statistics import mean
from typing import Any, Callable, Dict, Iterable, List

from src.agents.match_agent import MatchResult
from src.prompts import PromptLoader

try:  # pragma: no cover - optional dependency
    from src.mcp_adapters import llm_adapter
except ImportError:  # pragma: no cover
    llm_adapter = None  # type: ignore


@dataclass
class SummaryBundle:
    markdown: str
    anomalies: List[str]
    totals: Dict[str, Any]

    def to_dict(self) -> Dict[str, Any]:
        return asdict(self)


class SummaryAgent:
    """Generate run summaries via template- or LLM-based approaches."""

    def __init__(self, prompt_loader: PromptLoader | None = None) -> None:
        self.prompt_loader = prompt_loader or PromptLoader()

    def generate(self, matches: Iterable[MatchResult]) -> SummaryBundle:
        results = list(matches)
        doc_rows: List[Dict[str, Any]] = []
        journal_rows: List[Dict[str, Any]] = []
        anomalies: List[str] = []
        confidences: List[float] = []
        total_amount = 0.0

        for match in results:
            journal = match.ledger_entry
            journal_rows.append({
                "entry_id": journal.entry_id,
                "vendor_id": journal.vendor_id,
                "vendor_name": journal.vendor_name,
                "invoice_id": journal.invoice_id,
                "po_id": journal.po_id,
                "amount": journal.amount,
                "currency": journal.currency,
                "posting_date": journal.entry_date,
                "status": journal.status,
            })
            total_amount += journal.amount

            for doc in match.documents:
                doc_rows.append({
                    "document": doc.filename,
                    "type": doc.doc_type,
                    "vendor": doc.vendor_name,
                    "invoice": doc.invoice_id,
                    "po": doc.po_id,
                    "date": doc.date,
                    "amount": doc.amount,
                    "currency": doc.currency,
                    "path": doc.path,
                    "manifest_ref": doc.manifest_ref,
                    "confidence": doc.extraction_confidence,
                })
                confidences.append(doc.extraction_confidence)
            anomalies.extend(match.notes)

        coverage = 0.0
        if doc_rows and journal_rows:
            coverage = round(len(doc_rows) / len(journal_rows), 2)

        avg_conf = round(mean(confidences), 3) if confidences else 0.0

        prompt = self.prompt_loader.render(
            **{
                "JSON-LIST-OF-DOCS": json.dumps(doc_rows, indent=2),
                "JSON-LIST-OF-JOURNAL-ROWS": json.dumps(journal_rows, indent=2),
            }
        )

        markdown = self._mock_summary(doc_rows, journal_rows, anomalies, total_amount, avg_conf, coverage)

        return SummaryBundle(
            markdown=markdown,
            anomalies=anomalies,
            totals={
                "journal_entries": len(journal_rows),
                "documents": len(doc_rows),
                "total_amount": round(total_amount, 2),
                "average_confidence": avg_conf,
                "coverage_ratio": coverage,
                "prompt": prompt,
            },
        )

    def generate_summary(self, context: Dict[str, Any], use_llm: bool = False) -> str:
        """Produce a deterministic summary string from context."""
        if use_llm and llm_adapter is not None and hasattr(llm_adapter, "call_llm"):
            prompt = json.dumps(context, indent=2)
            try:
                return llm_adapter.call_llm(prompt)
            except Exception:  # pragma: no cover - fall back to mock summary
                pass
        return self._render_markdown(context)

    def stream_summary(
        self,
        context: Dict[str, Any],
        stream_callback: Callable[[str], None],
        use_llm: bool = True,
    ) -> str:
        """Stream summary content via callback while returning the full text."""
        if not use_llm:
            rendered = self.generate_summary(context, use_llm=False)
            stream_callback(rendered)
            return rendered

        if llm_adapter is not None and hasattr(llm_adapter, "call_llm"):
            payload = json.dumps(context, indent=2)
            if getattr(llm_adapter, "USE_MOCK", True):
                chunks: List[str] = []
                for chunk in llm_adapter.call_llm(payload, stream=True):
                    chunks.append(chunk)
                    stream_callback(chunk)
                return "".join(chunks)
            response = llm_adapter.call_llm(payload)
            stream_callback(response)
            return response

        rendered = self.generate_summary(context, use_llm=False)
        stream_callback(rendered)
        return rendered

    def _mock_summary(
        self,
        doc_rows: List[Dict[str, Any]],
        journal_rows: List[Dict[str, Any]],
        anomalies: List[str],
        total_amount: float,
        avg_conf: float,
        coverage: float,
    ) -> str:
        summary_lines = [
            "# Audit Summary",
            "",
            "## Executive Overview",
            (
                "Reviewed {entries} journal entries linked to {docs} documents "
                "totalling {amount:.2f}. Evidence coverage ratio is {coverage:.2%} "
                "with average extraction confidence of {confidence:.2f}."
            ).format(
                entries=len(journal_rows),
                docs=len(doc_rows),
                amount=total_amount,
                coverage=coverage,
                confidence=avg_conf,
            ),
            "",
            "## Evidence Map",
            "| Document | Type | Vendor | Invoice | PO | Date | Amount | Path | Confidence |",
            "| --- | --- | --- | --- | --- | --- | --- | --- | --- |",
        ]

        for row in doc_rows:
            summary_lines.append(
                "| {document} | {type} | {vendor} | {invoice} | {po} | {date} | {amount:.2f} {currency} | {path} | {confidence:.2f} |".format(**row)
            )

        summary_lines.extend(["", "## Anomalies"])
        if anomalies:
            for issue in anomalies:
                summary_lines.append(f"- {issue}")
        else:
            summary_lines.append("- None observed")

        return "\n".join(summary_lines)

    def _render_markdown(self, context: Dict[str, Any]) -> str:
        docs = context.get("documents", [])
        journal = context.get("journal_entries", [])
        anomalies = context.get("anomalies", [])
        total_amount = sum(item.get("amount", 0.0) for item in journal)
        avg_conf = 0.0
        confidences = [doc.get("confidence", 0.9) for doc in docs]
        if confidences:
            avg_conf = round(sum(confidences) / len(confidences), 3)
        coverage = round(len(docs) / len(journal), 2) if journal else 0.0

        doc_rows = [
            {
                "document": doc.get("filename", ""),
                "type": doc.get("doc_type", ""),
                "vendor": doc.get("vendor_name", ""),
                "invoice": doc.get("invoice_id", ""),
                "po": doc.get("po_id", ""),
                "date": doc.get("date", ""),
                "amount": doc.get("amount", 0.0),
                "currency": doc.get("currency", "USD"),
                "path": doc.get("path", ""),
                "confidence": doc.get("confidence", doc.get("extraction_confidence", 0.9)),
            }
            for doc in docs
        ]

        journal_rows = [
            {
                "entry_id": row.get("entry_id", ""),
                "vendor_id": row.get("vendor_id", ""),
                "invoice_id": row.get("invoice_id", ""),
                "po_id": row.get("po_id", ""),
                "amount": row.get("amount", 0.0),
                "currency": row.get("currency", "USD"),
                "posting_date": row.get("posting_date", ""),
            }
            for row in journal
        ]

        return self._mock_summary(doc_rows, journal_rows, anomalies, total_amount, avg_conf, coverage)


__all__ = ["SummaryAgent", "SummaryBundle"]
