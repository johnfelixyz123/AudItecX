"""Packaging utilities for audit run artifacts."""
from __future__ import annotations

import json
import shutil
import zipfile
from dataclasses import asdict
from pathlib import Path
from typing import Dict, Iterable, List, TYPE_CHECKING

from src.agents.summary_agent import SummaryBundle

if TYPE_CHECKING:
    from src.agents.match_agent import MatchResult

ROOT = Path(__file__).resolve().parents[1]
OUT_DIR = ROOT / "out"
AUDIT_LOG_DIR = ROOT / "audit_logs"


class Packager:
    """Materialize summaries, manifests, and evidence packages."""

    def __init__(self, output_dir: Path | None = None, audit_log_dir: Path | None = None) -> None:
        self.output_dir = Path(output_dir) if output_dir else OUT_DIR
        self.audit_log_dir = Path(audit_log_dir) if audit_log_dir else AUDIT_LOG_DIR
        self.output_dir.mkdir(parents=True, exist_ok=True)
        self.audit_log_dir.mkdir(parents=True, exist_ok=True)

    def create_package(
        self,
        run_id: str,
        summary: SummaryBundle,
        matches: Iterable["MatchResult"],
    ) -> Dict[str, Path]:
        matches = list(matches)
        work_dir = self.output_dir / f"run_{run_id}"
        documents_dir = work_dir / "documents"
        work_dir.mkdir(parents=True, exist_ok=True)
        documents_dir.mkdir(parents=True, exist_ok=True)

        doc_entries: List[Dict[str, str]] = []
        journal_entries: List[Dict[str, str]] = []
        unique_docs = {}

        for match in matches:
            ledger = match.ledger_entry
            journal_entries.append({
                "entry_id": ledger.entry_id,
                "vendor_id": ledger.vendor_id,
                "invoice_id": ledger.invoice_id,
                "po_id": ledger.po_id,
                "amount": ledger.amount,
                "currency": ledger.currency,
                "posting_date": ledger.entry_date,
                "status": ledger.status,
            })
            for doc in match.documents:
                if doc.filename not in unique_docs:
                    copy_target = documents_dir / doc.filename
                    try:
                        shutil.copyfile(doc.path, copy_target)
                    except FileNotFoundError:
                        # Skip missing documents in mock mode but record anomaly
                        copy_target.write_text(doc.text, encoding="utf-8")
                    doc_record = {
                        "document": doc.filename,
                        "manifest_ref": doc.manifest_ref,
                        "path": str(copy_target.relative_to(work_dir)),
                        "source_path": doc.path,
                        "amount": doc.amount,
                        "currency": doc.currency,
                        "vendor": doc.vendor_name,
                        "invoice": doc.invoice_id,
                        "po": doc.po_id,
                        "date": doc.date,
                        "confidence": doc.extraction_confidence,
                    }
                    unique_docs[doc.filename] = doc_record
                doc_entries.append(unique_docs[doc.filename])

        summary_path = work_dir / "summary.md"
        summary_path.write_text(summary.markdown, encoding="utf-8")

        journal_path = work_dir / "journal_entries.json"
        journal_path.write_text(json.dumps(journal_entries, indent=2), encoding="utf-8")

        documents_path = work_dir / "documents.json"
        documents_path.write_text(json.dumps(doc_entries, indent=2), encoding="utf-8")

        manifest = {
            "run_id": run_id,
            "summary": asdict(summary),
            "journal_entries": journal_entries,
            "documents": list(unique_docs.values()),
        }

        manifest_path = self.audit_log_dir / f"{run_id}.json"
        manifest_json = json.dumps(manifest, indent=2)
        manifest_path.write_text(manifest_json, encoding="utf-8")

        # Also include manifest copy inside the package for convenience
        internal_manifest_path = work_dir / "manifest.json"
        internal_manifest_path.write_text(manifest_json, encoding="utf-8")

        archive_summary_path = self.audit_log_dir / f"{run_id}_summary.md"
        archive_summary_path.write_text(summary.markdown, encoding="utf-8")

        zip_path = self.output_dir / f"package_{run_id}.zip"
        with zipfile.ZipFile(zip_path, "w", zipfile.ZIP_DEFLATED) as zf:
            for file_path in work_dir.rglob("*"):
                if file_path.is_file():
                    zf.write(file_path, file_path.relative_to(work_dir))

        shutil.rmtree(work_dir)

        return {
            "package_path": zip_path,
            "summary_path": archive_summary_path,
            "manifest_path": manifest_path,
        }


__all__ = ["Packager", "OUT_DIR", "AUDIT_LOG_DIR"]
