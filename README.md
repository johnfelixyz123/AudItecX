# AudItecX — The AI-Powered Audit Experience

AudItecX is a prototype audit documentation aggregator focused on supplier payment reviews. It demonstrates an extendable architecture ready for MCP-enabled agentic flows while remaining 100% runnable offline using mocked adapters and data.

## ⚙️ Features
- Accepts natural-language audit requests and translates them into deterministic task plans
- Streams orchestration progress and summary chunks to the browser using Server-Sent Events (SSE)
- Ingests vendor/invoice/PO identifiers surfaced by the intent parser and locates supporting documents from `mock_data/`
- Queries a mock ledger (SQLite) for journal entries tied to the identifiers
- Extracts and normalizes document content via MCP adapter stubs
- Reconciles documents with journal rows, computing match confidence and anomalies
- Generates auditor-friendly summaries using a pluggable LLM adapter (mock + real stubs)
- Packages evidence (docs, summary, journal extracts, manifest) into a ZIP under `out/`
- Creates audit log artifacts in `audit_logs/` and simulates GitHub/Email notifications
- Offers both a streaming Flask UI and a CLI backed by the same orchestrator

## 🧱 Project Structure
```
AudItecX/
├── README.md
├── requirements.txt
├── .vscode/
├── mock_data/
│   ├── files/
│   └── journal_entries.csv
├── src/
│   ├── app.py
│   ├── aggregator.py
│   ├── cli.py
│   ├── orchestrator.py
│   ├── packager.py
│   ├── prompts/
│   │   └── summary_prompt.txt
│   ├── ui/templates/
│   │   └── index.html
│   ├── agents/
│   │   ├── doc_agent.py
│   │   ├── data_agent.py
│   │   ├── match_agent.py
│   │   ├── summary_agent.py
│   │   └── notify_agent.py
│   ├── nlu/
│   │   └── intent_parser.py
│   └── mcp_adapters/
│       ├── markitdown_adapter.py
│       ├── imagesorcery_adapter.py
│       ├── db_adapter.py
│       ├── vectorstore_adapter.py
│       ├── github_adapter.py
│       └── email_adapter.py
├── scripts/
│   ├── seed_db.py
│   └── run_local_smtp.py
├── tests/
│   ├── conftest.py
│   ├── test_db_adapter.py
│   ├── test_match_agent.py
│   └── test_packager.py
├── audit_logs/
└── out/
```

## 🚀 Getting Started

1. **Create & activate a virtual environment**
   ```bash
   python -m venv venv
   source venv/bin/activate  # Windows: venv\Scripts\activate
   ```

2. **Install dependencies**
   ```bash
   pip install -r requirements.txt
   ```

3. **Seed the mock ledger** (optional, already seeded)
   ```bash
   python scripts/seed_db.py
   ```

4. **Run unit tests**
   ```bash
   pytest
   ```

5. **Start the streaming Flask UI**
   ```bash
   python src/app.py
   ```
   Open http://127.0.0.1:5000 and submit a natural language request. Summary text and status updates will stream into the page, with download/send actions exposed when packaging completes.

6. **Use the CLI**
   ```bash
   python src/cli.py "Compare Q2 invoices for VEND-100" --email auditor@example.com
   ```

7. **Run the test suite**
   ```bash
   pytest tests/
   ```

## 🧠 LLM Adapter
The summary agent uses `SummaryAgent.generate_summary()` which delegates to `summary_agent.generate_with_llm()`. Two modes are available:
- **Mock Mode (default)**: deterministic template summarizer
- **Real Mode (commented example)**: shows how to integrate OpenAI/HF clients when credentials are available

Switching adapters happens via dependency injection; tests rely on the mock mode.

## 🧪 Tests
- `test_db_adapter.py`: ensures the SQLite-backed adapter returns expected journal entries
- `test_match_agent.py`: verifies matching heuristics and anomaly detection
- `test_packager.py`: validates package contents and manifest creation

Execute: `pytest`

## 🧩 Extensibility
- MCP adapters live in `src/mcp_adapters/` and can be swapped for real MCP server calls
- Agents are small, composable classes orchestrated by `src/orchestrator.py` (the legacy `aggregator.py` pipeline is retained for reference)
- UI streams via native SSE so browser connections remain lightweight while preserving ordering
- Packaging pipeline runs in a background thread for non-blocking UX

## 🔄 Mock vs. Live Integrations
- All adapters ship with `USE_MOCK = True` to keep the project self-contained. Toggle this flag to `False` in a specific adapter (for example `src/mcp_adapters/llm_adapter.py` or `src/mcp_adapters/email_adapter.py`) to integrate a real backend.
- When running in mock mode, both the Flask UI and CLI execute entirely offline using deterministic outputs.
- After toggling any `USE_MOCK` flag, restart the CLI or Flask process so the new configuration is picked up.

## 📬 Notifications
`NotifyAgent` writes to `audit_logs/` using the GitHub adapter stub and prints email output. Replace with MCP-backed implementations by flipping the `USE_MOCK` flag and configuring credentials.

## 🧾 Sample Data
Mock documents and ledger entries cover multiple vendor/invoice combos. Files include embedded metadata headers so agents can simulate extraction steps reliably.

## 📄 Manifest & Output
Each run produces:
- `out/package_<RUN_ID>.zip`
- `audit_logs/<RUN_ID>.json`
- `audit_logs/<RUN_ID>_github_issue.md`
- Summary preview within the UI

## 📌 Notes
- All adapters default to mock mode and avoid external side effects
- No destructive operations are performed against ledgers or source systems
- Real MCP integrations can be enabled by replacing stub implementations and providing config

Enjoy exploring AudItecX! Contributions and extensions are welcome.
