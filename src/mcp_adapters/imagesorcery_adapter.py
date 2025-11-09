"""Mock adapter for the imagesorcery MCP server."""
from __future__ import annotations

from pathlib import Path
from typing import Dict

USE_MOCK = True


def ocr(path: str | Path) -> Dict[str, object]:
    """Return structured OCR output for the given file."""
    path = Path(path)
    if not path.exists():
        raise FileNotFoundError(f"imagesorcery_adapter: {path} not found")

    if not USE_MOCK:
        raise NotImplementedError("Real MCP integration is not configured")

    if path.suffix.lower() in {".png", ".jpg", ".jpeg"}:
        text = "[Image OCR text placeholder for mock environment]"
        confidence = 0.85
    else:
        text = path.read_text(encoding="utf-8")
        confidence = 0.98

    return {"text": text, "confidence": confidence, "path": str(path)}
