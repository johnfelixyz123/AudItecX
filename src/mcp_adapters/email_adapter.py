"""Email MCP adapter stub using console output or a local SMTP server."""
from __future__ import annotations

import smtplib
from email.message import EmailMessage
from pathlib import Path
from typing import Iterable, Dict, Any

from datetime import datetime

ROOT = Path(__file__).resolve().parents[2]
EMAIL_LOG_DIR = ROOT / "audit_logs"
EMAIL_LOG_DIR.mkdir(parents=True, exist_ok=True)

USE_MOCK = True
SMTP_HOST = "localhost"
SMTP_PORT = 1025


def send(
    to: str,
    subject: str,
    body: str,
    attachments: Iterable[Path] | None = None,
    use_mock: bool | None = None,
) -> Dict[str, Any]:
    if use_mock is None:
        use_mock = USE_MOCK

    if use_mock:
        timestamp = datetime.utcnow().strftime("%Y%m%dT%H%M%SZ")
        path = EMAIL_LOG_DIR / f"email_{timestamp}.txt"
        lines = [
            f"To: {to}",
            f"Subject: {subject}",
            "",
            body,
        ]
        if attachments:
            lines.append("")
            lines.append("Attachments:")
            for attachment in attachments:
                lines.append(str(attachment))
        path.write_text("\n".join(lines), encoding="utf-8")
        return {"status": "sent", "mode": "mock", "path": str(path)}

    msg = EmailMessage()
    msg["To"] = to
    msg["Subject"] = subject
    msg.set_content(body)

    for attachment in attachments or []:
        path = Path(attachment)
        msg.add_attachment(
            path.read_bytes(),
            maintype="application",
            subtype="octet-stream",
            filename=path.name,
        )

    with smtplib.SMTP(SMTP_HOST, SMTP_PORT) as smtp:
        smtp.send_message(msg)

    return {"status": "sent", "mode": "smtp"}


def send_email(to: str, subject: str, body: str, attachments: Iterable[Path] | None = None) -> Dict[str, Any]:
    return send(to, subject, body, attachments=attachments)
