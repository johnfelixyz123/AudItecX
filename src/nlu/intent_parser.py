"""Lightweight natural language intent parsing utilities."""
from __future__ import annotations

import re
from dataclasses import dataclass
from typing import Dict, Iterable, List, Optional

try:  # pragma: no cover - optional dependency wiring
    from src.mcp_adapters import llm_adapter
except ImportError:  # pragma: no cover - allow parsing without adapter
    llm_adapter = None  # type: ignore

_VENDOR_PATTERN = re.compile(r"\bVEND-\d+\b", re.IGNORECASE)
_INVOICE_PATTERN = re.compile(r"\bINV-\d+\b", re.IGNORECASE)
_PO_PATTERN = re.compile(r"\bPO-\d+\b", re.IGNORECASE)
_DATE_PATTERN = re.compile(r"\b\d{4}-\d{2}-\d{2}\b")
_QUARTER_PATTERN = re.compile(r"\bQ([1-4])\s*(20\d{2})\b", re.IGNORECASE)


@dataclass
class ParsedIntent:
    """Container holding the structured interpretation of a query."""

    intent: str
    vendor_ids: List[str]
    invoice_ids: List[str]
    po_ids: List[str]
    date_from: Optional[str]
    date_to: Optional[str]
    actions: List[str]
    raw: str

    def asdict(self) -> Dict[str, object]:
        """Return a JSON-serialisable view of the parsed intent."""
        return {
            "intent": self.intent,
            "entities": {
                "vendor_ids": self.vendor_ids,
                "invoice_ids": self.invoice_ids,
                "po_ids": self.po_ids,
                "date_range": {"from": self.date_from, "to": self.date_to},
                "actions": self.actions,
            },
            "raw": self.raw,
        }


def parse_intent(nl_text: str, use_llm: bool = False) -> Dict[str, object]:
    """Parse an audit-oriented natural language request into structured intent data."""
    text = (nl_text or "").strip()
    if not text:
        return ParsedIntent(
            intent="general_query",
            vendor_ids=[],
            invoice_ids=[],
            po_ids=[],
            date_from=None,
            date_to=None,
            actions=[],
            raw=nl_text,
        ).asdict()

    if use_llm and llm_adapter is not None and hasattr(llm_adapter, "parse_intent"):
        try:
            return llm_adapter.parse_intent(text)
        except Exception:  # pragma: no cover - fall back if adapter fails
            pass

    vendor_ids = _extract_tokens(_VENDOR_PATTERN, text)
    invoice_ids = _extract_tokens(_INVOICE_PATTERN, text)
    po_ids = _extract_tokens(_PO_PATTERN, text)
    date_from, date_to = _extract_date_range(text)
    actions = _infer_actions(text.lower())
    intent = _infer_intent(text.lower(), actions)

    parsed = ParsedIntent(
        intent=intent,
        vendor_ids=vendor_ids,
        invoice_ids=invoice_ids,
        po_ids=po_ids,
        date_from=date_from,
        date_to=date_to,
        actions=actions,
        raw=nl_text,
    )
    return parsed.asdict()


def _extract_tokens(pattern: re.Pattern[str], text: str) -> List[str]:
    tokens: List[str] = []
    for match in pattern.findall(text):
        token = match.upper()
        if token not in tokens:
            tokens.append(token)
    return tokens


def _extract_date_range(text: str) -> tuple[Optional[str], Optional[str]]:
    iso_dates = _extract_tokens(_DATE_PATTERN, text)
    quarters = _QUARTER_PATTERN.findall(text)

    if iso_dates:
        start = min(iso_dates)
        end = max(iso_dates)
        return start, end

    if quarters:
        # Normalise quarters such that Q1 2025 -> 2025-Q1 etc.
        quarter_labels = [f"Q{q} {year}".upper() for q, year in quarters]
        start = min(quarter_labels)
        end = max(quarter_labels)
        return start, end

    return None, None


def _infer_actions(lower_text: str) -> List[str]:
    actions: List[str] = []
    if "send" in lower_text or "email" in lower_text:
        actions.append("send")
    if "download" in lower_text or "export" in lower_text:
        actions.append("export")
    if "summar" in lower_text:
        actions.append("summarize")
    if "package" in lower_text:
        actions.append("package")
    return actions


def _infer_intent(lower_text: str, actions: Iterable[str]) -> str:
    if "download" in lower_text or "export" in lower_text:
        return "download_package"
    if "send" in lower_text and "package" in lower_text:
        return "send_package"
    if "summar" in lower_text and "package" not in lower_text:
        return "get_summary"
    if "prepare" in lower_text or "generate" in lower_text or "package" in lower_text:
        return "generate_package"
    if "notify" in lower_text:
        return "send_package"
    if "share" in lower_text:
        return "send_package"
    return "general_query"


__all__ = ["parse_intent"]
