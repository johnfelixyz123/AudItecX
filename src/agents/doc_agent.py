"""DocAgent provides deterministic document discovery in mock mode."""
from __future__ import annotations

import re
from dataclasses import dataclass, asdict
from pathlib import Path
from typing import Dict, Iterable, List


ROOT = Path(__file__).resolve().parents[2]
FILES_DIR = ROOT / "mock_data" / "files"


@dataclass
class DocumentRecord:
    filename: str
    path: str
    doc_type: str
    vendor_id: str
    vendor_name: str
    invoice_id: str
    po_id: str
    date: str
    amount: float
    currency: str
    text: str
    manifest_ref: str
    extraction_confidence: float

    def to_dict(self) -> Dict[str, object]:
        return asdict(self)


METADATA_LINE = re.compile(r"^(?P<key>[A-Z_ ]+):\s*(?P<value>.+)$", re.IGNORECASE)


def find_docs(identifiers: Iterable[str], directories: Iterable[Path] | None = None) -> List[Dict[str, object]]:
    """Return document payloads from mock files containing expected metadata."""
    id_set = {value.strip().upper() for value in identifiers if value}
    paths = list(directories or [FILES_DIR])
    documents: List[Dict[str, object]] = []

    for directory in paths:
        if not directory.exists():
            continue
        for path in sorted(directory.iterdir()):
            if path.is_dir():
                continue
            metadata, body = _parse_file(path)
            if not metadata:
                continue
            if id_set and not _matches(metadata, id_set):
                continue
            documents.append(
                {
                    "filename": path.name,
                    "path": str(path),
                    "doc_type": metadata.get("document_type", metadata.get("doc_type", "unknown")),
                    "vendor_id": metadata.get("vendor_id", ""),
                    "vendor_name": metadata.get("vendor_name", ""),
                    "invoice_id": metadata.get("invoice_id", ""),
                    "po_id": metadata.get("po_id", ""),
                    "date": metadata.get("document_date", metadata.get("date", "")),
                    "amount": _safe_amount(metadata.get("amount")),
                    "currency": metadata.get("currency", "USD"),
                    "text": body,
                    "manifest_ref": metadata.get("manifest_ref", path.stem.upper()),
                    "confidence": 0.9,
                }
            )
    return documents


class DocAgent:
    """Adapter retaining previous interface for backwards compatibility."""

    def __init__(self, directories: Iterable[Path] | None = None) -> None:
        self.directories = list(directories or [FILES_DIR])

    def gather(self, identifiers: Iterable[str]) -> List[DocumentRecord]:
        records = []
        for payload in find_docs(identifiers, self.directories):
            records.append(
                DocumentRecord(
                    filename=payload["filename"],
                    path=payload["path"],
                    doc_type=payload["doc_type"],
                    vendor_id=payload["vendor_id"],
                    vendor_name=payload["vendor_name"],
                    invoice_id=payload["invoice_id"],
                    po_id=payload["po_id"],
                    date=payload["date"],
                    amount=float(payload["amount"]),
                    currency=payload["currency"],
                    text=payload["text"],
                    manifest_ref=payload["manifest_ref"],
                    extraction_confidence=float(payload["confidence"]),
                )
            )
        return records


def _parse_file(path: Path) -> tuple[Dict[str, str], str]:
    metadata: Dict[str, str] = {}
    try:
        lines = path.read_text(encoding="utf-8").splitlines()
    except UnicodeDecodeError:
        return {}, ""
    body_lines: List[str] = []
    for line in lines:
        match = METADATA_LINE.match(line)
        if match:
            key = match.group("key").strip().lower().replace(" ", "_")
            metadata[key] = match.group("value").strip()
        else:
            body_lines.append(line)
    return metadata, "\n".join(body_lines).strip()


def _matches(metadata: Dict[str, str], identifiers: Iterable[str]) -> bool:
    tokens = {
        metadata.get("vendor_id", "").upper(),
        metadata.get("invoice_id", "").upper(),
        metadata.get("po_id", "").upper(),
    }
    return any(token and token in identifiers for token in tokens)


def _safe_amount(raw: str | None) -> float:
    try:
        return float((raw or "0").replace(",", ""))
    except ValueError:
        return 0.0


__all__ = ["DocAgent", "DocumentRecord", "find_docs"]
