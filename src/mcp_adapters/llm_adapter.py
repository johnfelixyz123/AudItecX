"""Deterministic LLM adapter used for mock and future MCP integrations."""
from __future__ import annotations

import re
from typing import Dict, Iterable, Iterator, List, Optional

USE_MOCK = True

_VENDOR_PATTERN = re.compile(r"\bVEND-\d+\b", re.IGNORECASE)
_INVOICE_PATTERN = re.compile(r"\bINV-\d+\b", re.IGNORECASE)
_PO_PATTERN = re.compile(r"\bPO-\d+\b", re.IGNORECASE)
_QUARTER_PATTERN = re.compile(r"\bQ[1-4]\s?\d{4}\b", re.IGNORECASE)
_YEAR_PATTERN = re.compile(r"\b20\d{2}\b")
_EMAIL_PATTERN = re.compile(r"[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}", re.IGNORECASE)


def call_llm(prompt: str, stream: bool = False, max_tokens: int = 512):
    """Return a deterministic response or streaming iterator for the given prompt."""
    if USE_MOCK:
        if stream:
            return _mock_stream_response(prompt)
        return _mock_complete_response(prompt)

    # To enable a real LLM, toggle USE_MOCK to False and wire up the client here.
    # Example using OpenAI responses API:
    # from openai import OpenAI
    # client = OpenAI()
    # response = client.responses.create(
    #     model="gpt-4o",
    #     input=prompt,
    #     max_output_tokens=max_tokens,
    # )
    # return response.output_text
    raise NotImplementedError("Real LLM integration is not configured")


def parse_intent(nl_text: str, examples: Optional[Iterable[Dict[str, object]]] = None) -> Dict[str, object]:
    """Parse natural language text into a structured intent payload."""
    text = nl_text.strip()
    lower = text.lower()

    intent = _infer_intent(lower)
    entities: Dict[str, object] = {
        "vendors": _extract_tokens(_VENDOR_PATTERN, text),
        "invoices": _extract_tokens(_INVOICE_PATTERN, text),
        "purchase_orders": _extract_tokens(_PO_PATTERN, text),
        "quarters": _extract_tokens(_QUARTER_PATTERN, text),
        "years": _extract_tokens(_YEAR_PATTERN, text),
        "send_to": _extract_tokens(_EMAIL_PATTERN, text),
        "include_journal": bool(re.search(r"journal|ledger", lower)),
        "focus": _infer_focus(lower),
    }

    if examples:
        entities["examples_used"] = len(list(examples))

    return {"intent": intent, "entities": entities}


def plan(parsed_intent: Dict[str, object]) -> List[Dict[str, object]]:
    """Generate a deterministic plan based on the parsed intent."""
    entities = parsed_intent.get("entities", {}) if isinstance(parsed_intent, dict) else {}

    steps: List[Dict[str, object]] = [
        {
            "step": 1,
            "action": "gather_identifiers",
            "details": {
                "vendors": entities.get("vendors", []),
                "invoices": entities.get("invoices", []),
                "purchase_orders": entities.get("purchase_orders", []),
            },
        },
        {
            "step": 2,
            "action": "collect_documents",
            "details": {
                "source": "mock_storage",
                "include_journal": entities.get("include_journal", False),
            },
        },
        {
            "step": 3,
            "action": "analyze",
            "details": {
                "focus": entities.get("focus"),
                "periods": {
                    "quarters": entities.get("quarters", []),
                    "years": entities.get("years", []),
                },
            },
        },
        {
            "step": 4,
            "action": "summarize",
            "details": {
                "intent": parsed_intent.get("intent"),
                "max_tokens": 512,
            },
        },
    ]

    recipients = entities.get("send_to") or []
    if recipients:
        steps.append(
            {
                "step": len(steps) + 1,
                "action": "notify",
                "details": {"recipients": recipients},
            }
        )

    return steps


def _mock_complete_response(prompt: str) -> str:
    """Produce a concise, repeatable mock completion."""
    summary = _summarize_prompt(prompt)
    return f"Mock summary:\n{summary}\n--\nTokens used: {min(512, max(len(prompt) // 6, 32))}"


def _mock_stream_response(prompt: str) -> Iterator[str]:
    """Yield deterministic chunks that simulate a streaming LLM."""
    summary = _summarize_prompt(prompt)
    mid = len(summary) // 2 or len(summary)
    first = summary[:mid].strip() or "Summary part 1"
    second = summary[mid:].strip() or "Summary part 2"
    yield first
    yield second
    yield "-- End of mock stream --"


def _summarize_prompt(prompt: str) -> str:
    """Extract key tokens from the prompt for deterministic output."""
    keywords = sorted(set(re.findall(r"[A-Z]{3,}-\d+", prompt, flags=re.IGNORECASE)))
    vendors = ", ".join(_extract_tokens(_VENDOR_PATTERN, prompt)) or "no vendors"
    invoices = ", ".join(_extract_tokens(_INVOICE_PATTERN, prompt)) or "no invoices"
    extras = ", ".join(keywords) or "no tagged codes"
    return (
        f"Focus on vendors: {vendors}. "
        f"Invoices involved: {invoices}. "
        f"Additional codes: {extras}."
    )


def _extract_tokens(pattern: re.Pattern[str], text: str) -> List[str]:
    """Return unique tokens matched by the provided regex pattern."""
    seen = []
    for match in pattern.findall(text):
        token = match.upper()
        if token not in seen:
            seen.append(token)
    return seen


def _infer_intent(lower_text: str) -> str:
    """Derive a simple intent label from the natural language query."""
    if "audit" in lower_text and "evidence" in lower_text:
        return "prepare_audit_evidence"
    if "invoice" in lower_text and "send" in lower_text:
        return "collect_and_share_invoices"
    if "summary" in lower_text or "report" in lower_text:
        return "summarize_findings"
    if "risk" in lower_text:
        return "assess_risks"
    return "general_query"


def _infer_focus(lower_text: str) -> Optional[str]:
    """Detect focus keywords such as late payments or anomalies."""
    if "late payment" in lower_text or "late payments" in lower_text:
        return "late_payments"
    if "anomaly" in lower_text or "outlier" in lower_text:
        return "anomalies"
    if "compliance" in lower_text:
        return "compliance"
    return None


__all__ = ["USE_MOCK", "call_llm", "parse_intent", "plan"]
