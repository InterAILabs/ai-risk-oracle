# Python Agent Middleware Example

This example shows how to call InterAI before an agent executes a tool or action.
It uses only the Python standard library.

## Configure

```bash
cp .env.example .env
```

```env
INTERAI_API_KEY=YOUR_API_KEY
INTERAI_BASE_URL=https://ai-risk-oracle.fly.dev
```

Do not commit `.env` or real API keys.

## Run

```bash
export INTERAI_API_KEY="YOUR_API_KEY"
export INTERAI_BASE_URL="https://ai-risk-oracle.fly.dev"
python example_agent.py
```

PowerShell:

```powershell
$env:INTERAI_API_KEY="YOUR_API_KEY"
$env:INTERAI_BASE_URL="https://ai-risk-oracle.fly.dev"
python example_agent.py
```

`interai_middleware.py` calls `POST /verify`, then maps the decision:

- `allow`: execute the sandbox executor
- `review_required`: route to supervisor, human, or policy engine
- `block`: abort and log

Store `trust_receipt_id` with your job, payment, tool call, or workflow record.
