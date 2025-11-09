"""Run a local SMTP debug server."""
from __future__ import annotations

import asyncore
import smtpd

HOST = "localhost"
PORT = 1025


class DebugServer(smtpd.DebuggingServer):
    pass


def main() -> None:
    server = DebugServer((HOST, PORT), None)
    print(f"SMTP debug server running on {HOST}:{PORT}")
    try:
        asyncore.loop()
    except KeyboardInterrupt:
        print("Stopping SMTP debug server")


if __name__ == "__main__":
    main()
