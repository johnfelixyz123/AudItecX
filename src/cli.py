"""Natural-language CLI entrypoint for AudItecX."""
from __future__ import annotations

import argparse
import logging
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
if str(ROOT) not in sys.path:
    sys.path.append(str(ROOT))

from src.nlu import intent_parser  # noqa: E402
from src.orchestrator import Orchestrator  # noqa: E402

LOGGER = logging.getLogger("auditecx.cli")


def parse_args(argv: list[str] | None = None) -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Run the AudItecX orchestration flow")
    parser.add_argument("query", help="Natural language request describing the task")
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Execute without creating a package archive",
    )
    parser.add_argument(
        "--log-level",
        default="INFO",
        help="Logging level (DEBUG, INFO, WARNING, ERROR)",
    )
    return parser.parse_args(argv)


def _print_chunk(chunk: str) -> None:
    if not chunk:
        return
    end = "" if chunk.endswith("\n") else "\n"
    print(chunk, end=end, flush=True)


def main(argv: list[str] | None = None) -> int:
    args = parse_args(argv)
    logging.basicConfig(level=getattr(logging, args.log_level.upper(), logging.INFO))

    orchestrator = Orchestrator()

    try:
        parsed_intent = intent_parser.parse_intent(args.query, use_llm=False)
        LOGGER.debug("Parsed intent: %s", parsed_intent)
        result = orchestrator.execute(
            parsed_intent=parsed_intent,
            stream_callback=_print_chunk,
            dry_run=args.dry_run,
        )
    except Exception as exc:  # pragma: no cover - CLI surfacing
        LOGGER.exception("CLI execution failed")
        print(f"Error: {exc}")
        return 1

    print("\n---")
    print(f"Run ID: {result['run_id']}")
    package_path = result.get("package_path")
    if package_path:
        print(f"Package: {package_path}")
    else:
        print("Package: (dry run, not generated)")
    print(f"Manifest: {result['manifest_path']}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
