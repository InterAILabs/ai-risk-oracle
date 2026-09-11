# TypeScript Agent Middleware Example

This example shows how to call InterAI before an agent executes a tool or action.
It uses Node 18+ native `fetch` and does not import service internals.

## Install

```bash
cd examples/agent-middleware/typescript
npm install
```

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
npm run start
```

PowerShell:

```powershell
$env:INTERAI_API_KEY="YOUR_API_KEY"
$env:INTERAI_BASE_URL="https://ai-risk-oracle.fly.dev"
npm run start
```

`interaiMiddleware.ts` calls `POST /verify`, then maps the decision:

- `allow` + `policy_result=allow`: do not dispatch until the host has verified the receipt and validated the exact canonical final intent plus `ExecutionAuthorization`; then execute the sandbox executor
- `review_required`: return a review route
- `block`: abort before execution
- network failure, malformed response, or timeout: throw before the executor runs

Pass one stable `operationId` for the same logical action across retries. The middleware derives the `X-Idempotency-Key` from that identifier instead of the current time, so a retry preserves operation identity rather than creating a second billable decision.

The example also sets an explicit verification timeout (`timeoutMs`, default `10000`). A verification timeout fails closed: the action is not executed.

Store `trust_receipt_id` with your job, payment, tool call, or workflow record.
