"""In-memory stub for a vector store MCP server."""
from __future__ import annotations

from typing import List, Dict, Any

USE_MOCK = True
_STORE: List[Dict[str, Any]] = []


def index_documents(documents: List[Dict[str, Any]]) -> None:
    if not USE_MOCK:
        raise NotImplementedError("Real MCP integration is not configured")
    _STORE.clear()
    _STORE.extend(documents)


def similarity_search(query: str, top_k: int = 3) -> List[Dict[str, Any]]:
    if not USE_MOCK:
        raise NotImplementedError("Real MCP integration is not configured")
    return _STORE[:top_k]
