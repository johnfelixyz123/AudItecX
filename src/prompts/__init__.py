"""Utility helpers for loading prompt templates."""
from __future__ import annotations

from dataclasses import dataclass
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
PROMPTS_DIR = Path(__file__).parent


@dataclass
class PromptLoader:
    template_name: str = "summary_prompt.txt"

    def load(self) -> str:
        path = PROMPTS_DIR / self.template_name
        return path.read_text(encoding="utf-8")

    def render(self, **placeholders: str) -> str:
        template = self.load()
        for key, value in placeholders.items():
            token = key if key.isupper() else key.upper()
            template = template.replace(f"<INSERT {token}>", value)
        return template


__all__ = ["PromptLoader", "ROOT", "PROMPTS_DIR"]
