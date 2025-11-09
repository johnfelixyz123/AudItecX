"""Mock adapter simulating the markitdown MCP server."""
from __future__ import annotations

from pathlib import Path
from typing import Dict

USE_MOCK = True


def extract(path: str | Path) -> Dict[str, object]:
    """Extract textual content from the supplied document path."""
    path = Path(path)
    if not path.exists():
        raise FileNotFoundError(f"markitdown_adapter: {path} not found")

    if not USE_MOCK:
        raise NotImplementedError("Real MCP integration is not configured")

    if path.suffix.lower() == ".pdf":
        text = "[PDF content placeholder for mock environment]"
        pages = 1
    else:
        text = path.read_text(encoding="utf-8")
        pages = max(1, text.count("\f") + 1)

    return {"text": text, "pages": pages, "path": str(path)}
