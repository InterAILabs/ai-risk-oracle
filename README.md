# InterAI Risk Oracle

Paid trust-verification infrastructure for autonomous agents.

InterAI Risk Oracle issues machine-readable trust receipts before agents trust outputs, execute tools, or settle payments.

## What This Is

InterAI Risk Oracle is an AI-to-AI service for systems that need to:

- evaluate prompt/response consistency
- estimate hallucination risk
- make automated decisions (`accept` / `review` / `reject`)
- produce signed trust receipts with verdicts, risk factors, claim counts, and request hashes
- pay per request with prepaid balance on Base USDC
- retrieve trust receipts for downstream audit or agent-to-agent verification

This is not a human-facing app. It is a machine-to-machine primitive.

Use it when a downstream action is more expensive than the verification: before paying another agent, executing a tool, accepting a tool output, storing a claim, or returning a sensitive answer.

## Core Capabilities

- Bearer API key authentication
- Prepaid account billing
- Per-request cost with microusdc precision
- x402 `402 Payment Required`, `PAYMENT-SIGNATURE`, facilitator verify/settle, and `PAYMENT-RESPONSE`
- Idempotent billing with `X-Idempotency-Key`
- Single and batch verification
- Historical account/domain trust context in verification responses
- Onchain topups on Base USDC
- Account traceability via `/me`, `/ledger`, `/usage`
- Trust receipts via `/trust/receipts`
- Trust reputation summaries via `/trust/reputation`
- Public canonical receipt lookup via `/trust/receipts/:receiptId`
- Signature verification via `/trust/verify-signature`
- Public JSON Schemas via `/schemas/trust-receipt.json`, `/schemas/trust-receipt-public.json`, and `/schemas/verify-result.json`
- Machine-readable discovery via `/.well-known`
- Public pricing metadata via `/pricing`
- A2A discovery via `/.well-known/agent.json`
- Single-fetch discovery bundle via `/.well-known/discovery-bundle.json`
- A2A synchronous JSON-RPC endpoint at `/a2a`
- MCP JSON-RPC bridge at `/mcp`
- MCP resources and prompts for host-friendly discovery
- Human-facing landing page at `/`
- Stable machine-readable service summary at `/service.json`
- SDK compiled to `dist/sdk/interai-risk-oracle.js`

## Quick Start

For the shortest external integration path, see [docs/quickstart.md](docs/quickstart.md).
For endpoint details, schemas, A2A, MCP, and SDK usage, see [docs/api-reference.md](docs/api-reference.md).
For release safety, see [docs/release-checklist.md](docs/release-checklist.md).

## Try In 2 Minutes

Inspect the live service:

```bash
curl -sS https://ai-risk-oracle.fly.dev/health
curl -sS https://ai-risk-oracle.fly.dev/pricing
curl -sS https://ai-risk-oracle.fly.dev/.well-known/agent.json
```

See the x402 payment requirement for a paid verification:

```bash
curl -i -sS -X POST https://ai-risk-oracle.fly.dev/verify \
  -H "Content-Type: application/json" \
  -d '{"prompt":"What is 2 + 2?","response":"4","domain":"math"}'
```

The unauthenticated response returns `402` plus `PAYMENT-REQUIRED`. Bearer API-key clients can use `/onboard` and prepaid balance; x402 clients can pay by retrying with `PAYMENT-SIGNATURE`.

1. Install dependencies and start the API:

```bash
npm install
npm run dev
```

2. Configure environment variables in `.env`:

```env
ADMIN_TOKEN=change-me
PAYMENT_MODE=onchain
TOPUP_RECEIVE_ADDRESS=0x...
BASE_RPC_URL=https://...
ONBOARDING_ENABLED=true
DEFAULT_RECOMMENDED_TOPUP_USDC=0.01
DEV_TOPUP_ENABLED=false
ONBOARDING_TRIAL_CREDIT_ENABLED=false
ONBOARDING_TRIAL_CREDIT_USDC=0.003
ONBOARDING_DEV_AUTO_CREDIT_ENABLED=false
ONBOARDING_DEV_AUTO_CREDIT_USDC=0.01
ALLOW_FAKE_TOPUP_CONFIRM=false
ORACLE_SIGNING_SECRET=
```

`ORACLE_SIGNING_SECRET` is optional in development. If omitted, verification still works and receipts are stored, but they are returned as unsigned.

## Fastest Integration Flow

1. Create an account:

```bash
curl -X POST http://localhost:3000/onboard \
  -H "Content-Type: application/json" \
  -d '{"name":"demo-agent"}'
```

2. Inspect the account:

```bash
curl -X GET http://localhost:3000/me \
  -H "Authorization: Bearer YOUR_API_KEY"
```

3. Fund the account:

Development:

```bash
curl -X POST http://localhost:3000/topup/dev/credit \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"amount_usdc":"0.01"}'
```

Onchain:

```bash
curl -X POST http://localhost:3000/topup/create \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"amount_usdc":"0.01"}'
```

Then confirm:

```bash
curl -X POST http://localhost:3000/topup/confirm \
  -H "X-Topup-Id: YOUR_TOPUP_ID" \
  -H "X-Tx-Hash: YOUR_BASE_USDC_TX_HASH"
```

4. Verify a response:

```bash
curl -X POST http://localhost:3000/verify \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -H "X-Idempotency-Key: example-1" \
  -d '{
    "prompt": "What is the capital of France?",
    "response": "Paris",
    "domain": "general"
  }'
```

Successful verification returns both a direct verdict and a canonical receipt:

```json
{
  "verdict": "accept",
  "trust_score": 0.94,
  "risk_level": "low",
  "risk_factors": [],
  "claims_checked": 3,
  "claims_supported": 3,
  "claims_uncertain": 0,
  "trust_receipt": {
    "receipt_id": "receipt-id",
    "request_hash": "sha256...",
    "verdict": "accept",
    "confidence": 0.94,
    "risk_factors": [],
    "claims_checked": 3,
    "claims_supported": 3,
    "claims_uncertain": 0,
    "signed": true,
    "signature_alg": "hmac-sha256"
  }
}
```

5. List trust receipts:

```bash
curl -X GET "http://localhost:3000/trust/receipts?limit=10" \
  -H "Authorization: Bearer YOUR_API_KEY"
```

6. Fetch the canonical public representation of a receipt:

```bash
curl -X GET "http://localhost:3000/trust/receipts/YOUR_RECEIPT_ID"
```

7. Verify a signed receipt when signing is enabled:

```bash
curl -X POST http://localhost:3000/trust/verify-signature \
  -H "Content-Type: application/json" \
  -d '{
    "receipt": { "...": "..." },
    "signature": "hex-signature",
    "signature_alg": "hmac-sha256"
  }'
```

8. Fetch public schemas for automation and validation:

```bash
curl -X GET http://localhost:3000/schemas/trust-receipt.json
curl -X GET http://localhost:3000/schemas/trust-receipt-public.json
curl -X GET http://localhost:3000/schemas/verify-result.json
```

9. Discover the service contract and runtime probes:

```bash
curl -X GET http://localhost:3000/
curl -X GET http://localhost:3000/service.json
curl -X GET http://localhost:3000/.well-known/ai-service.json
curl -X GET http://localhost:3000/.well-known/ai-risk-oracle
curl -X GET http://localhost:3000/.well-known/openapi.json
curl -X GET http://localhost:3000/openapi.json
curl -X GET http://localhost:3000/.well-known/agent.json
curl -X GET http://localhost:3000/.well-known/discovery-bundle.json
curl -X GET http://localhost:3000/discovery.json
curl -X GET http://localhost:3000/pricing
curl -X GET http://localhost:3000/health
curl -X GET http://localhost:3000/ready
```

10. Initialize the MCP bridge and inspect tools/resources/prompts:

```bash
curl -X POST http://localhost:3000/mcp \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "id": "init-1",
    "method": "initialize",
    "params": {
      "protocolVersion": "2025-11-25",
      "capabilities": {},
      "clientInfo": {
        "name": "example-client",
        "version": "0.0.1"
      }
    }
  }'

curl -X POST http://localhost:3000/mcp \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "id": "tools-1",
    "method": "tools/list"
  }'

curl -X POST http://localhost:3000/mcp \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "id": "resources-1",
    "method": "resources/list"
  }'

curl -X POST http://localhost:3000/mcp \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "id": "prompts-1",
    "method": "prompts/list"
  }'
```

11. Call the minimal A2A endpoint with bearer auth:

```bash
curl -X POST http://localhost:3000/a2a \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "id": "verify-1",
    "method": "message/send",
    "params": {
      "message": {
        "role": "user",
        "messageId": "client-msg-1",
        "parts": [
          {
            "kind": "data",
            "data": {
              "prompt": "What is the capital of France?",
              "response": "Paris",
              "domain": "general"
            }
          }
        ]
      },
      "metadata": {
        "idempotency_key": "a2a-example-1"
      }
    }
  }'
```

## Main Endpoints

- `POST /onboard`
- `GET /me`
- `GET /ledger`
- `GET /usage`
- `POST /verify`
- `POST /verify/batch`
- `GET /trust/receipts`
- `GET /trust/reputation`
- `GET /trust/receipts/:receiptId`
- `POST /trust/verify-signature`
- `GET /schemas/trust-receipt.json`
- `GET /schemas/trust-receipt-public.json`
- `GET /schemas/verify-result.json`
- `POST /topup/create`
- `POST /topup/confirm`
- `GET /topup/:topupId`
- `GET /health`
- `GET /ready`
- `GET /.well-known/agent.json`
- `POST /a2a`
- `POST /topup/dev/credit`
- `GET /.well-known/ai-service.json`
- `GET /.well-known/openapi.json`

## Billing Model

- Currency: USDC
- Chain: Base
- Unit: microusdc (`1e-6 USDC`)
- Model: prepaid balance
- Debit: per request
- Example verify cost: `0.0006 USDC`

## x402 Status

Paid endpoints support the x402 v2 server flow while keeping bearer prepaid billing for direct account integrations:

- missing payment returns HTTP `402`
- `PAYMENT-REQUIRED` contains base64-encoded payment requirements
- the JSON body includes a `resource` object and an `accepts` array with `scheme: "exact"`, `network: "eip155:8453"`, USDC asset, atomic amount, and pay-to address
- clients retry with `PAYMENT-SIGNATURE`
- the server verifies and settles through the configured facilitator
- successful paid responses include `PAYMENT-RESPONSE`
- `/pricing` exposes the same `protocols.x402.accepts` metadata for discovery

Set `X402_FACILITATOR_URL` to choose the facilitator; otherwise the default x402 facilitator URL from the official client is used.

## Agent-Native Examples

The repository includes copyable integration patterns:

```bash
npm run example:x402
npm run example:pre-payment
npm run example:pre-tool
npm run example:mcp-agent
npm run example:a2a-agent
npm run python:sdk
```

- `examples/x402-client.ts` inspects the production `402` response and decodes `PAYMENT-REQUIRED`.
- `examples/pre-payment-verification.ts` gates a payment decision on a trust receipt.
- `examples/pre-tool-execution-check.ts` gates a tool execution on a trust receipt.
- `examples/mcp-agent-verify.ts` calls the MCP tool bridge.
- `examples/a2a-agent-verify.ts` calls the A2A JSON-RPC endpoint.
- `examples/python_basic_agent.py` shows a dependency-free Python client that can read x402 payment requirements.

The bearer-authenticated examples require `ORACLE_API_KEY`; use `/onboard` and funding first.

## Benchmark Baseline

Run the initial public benchmark:

```bash
npm run benchmark
```

The benchmark is intentionally small and honest. It compares expected actions against the current trust-layer action across supported, uncertain, and risky outputs. The current baseline is conservative and may warn that calibration work is needed; that warning is product signal, not a test failure.

## Local Verification

Run the local verification suite:

```bash
npm test
```

Check the public package export, OpenAPI paths, schemas, pricing metadata, and discovery bundle:

```bash
npm run contracts
```

Check the npm package contents before publishing:

```bash
npm run package:check
```

Run the public benchmark baseline:

```bash
npm run benchmark
```

Type-check the package-style SDK consumer example:

```bash
npm run typecheck:examples
```

Validate production deployment environment variables before a real deploy:

```bash
npm run deploy:check
```

Then, if you want the broader smoke coverage, run:

```bash
npm run smoke:billing
npm run smoke:topup-confirm
npm run smoke:idempotency
npm run smoke:trust-signing
npm run smoke:sdk
```

`npm test` now checks deterministic scoring/trust scenarios plus account billing, insufficient balance, batch verification and repeated idempotency keys using `Fastify.inject()`, without needing a separately running `localhost` server.

The broader smoke scripts cover discovery, billing regression, topup replay protection, idempotent billing retries, trust receipt persistence, signed receipt verification, public receipt lookup, and SDK viability.

## Discovery And Contracts

- `GET /` serves the human-facing landing page for developers, evaluators, and operators.
- `GET /service.json` preserves a compact machine-readable service summary.
- `GET /.well-known/ai-service.json` exposes agent-oriented discovery metadata, billing conventions, schema URLs, and integration flow.
- `GET /.well-known/ai-risk-oracle` and `GET /.well-known/ai-risk-oracle.json` are discovery aliases for clients guessing the product-specific well-known path.
- `GET /.well-known/openapi.json` exposes the HTTP contract for tooling and SDK generation.
- `GET /openapi.json` aliases the OpenAPI contract for simpler manual discovery.
- `GET /.well-known/agent.json` exposes an A2A Agent Card at the recommended well-known location.
- `GET /.well-known/discovery-bundle.json` exposes a single-fetch discovery payload with service metadata, runtime mode, interfaces, schema URLs, and ready-to-copy samples.
- `GET /discovery.json` aliases the single-fetch discovery bundle.
- `GET /pricing` exposes public pricing, trial, top-up and idempotency metadata for self-serve integration.
- `POST /a2a` exposes a minimal A2A-compatible JSON-RPC interface for synchronous `message/send` verification calls.
- `POST /mcp` exposes an MCP bridge with `initialize`, `tools/list`, `tools/call`, `resources/list`, `resources/read`, `prompts/list`, and `prompts/get` over JSON-RPC.
- `GET /schemas/trust-receipt.json` describes the canonical signed receipt payload.
- `GET /schemas/trust-receipt-public.json` describes the public lookup response returned by `GET /trust/receipts/:receiptId`.
- `GET /schemas/verify-result.json` describes the enriched single-item verification response returned by `POST /verify`.

## Discovery Signals

If you want to know whether other agents are actually finding the service, inspect the admin stats endpoint:

```bash
curl -X GET http://localhost:3000/stats \
  -H "X-Admin-Token: YOUR_ADMIN_TOKEN"
```

`/stats` now includes lightweight discovery telemetry for:
- `/`
- `/service.json`
- `/.well-known/ai-service.json`
- `/.well-known/ai-risk-oracle`
- `/.well-known/openapi.json`
- `/openapi.json`
- `/discovery.json`
- `/.well-known/agent.json`
- `POST /a2a`
- public 404s with discovery links

It also tracks adoption milestones for:
- successful onboardings
- trial credits granted
- successful topup creation and confirmation
- successful `verify` calls
- successful `verify/batch` calls
- successful A2A executions
- trust receipt signature verification checks

This gives you a concrete funnel to watch:
- landing views
- discovery document views
- pricing views
- agent card views
- unexpected 404s
- A2A calls
- eventual onboardings, funded accounts, and verification traffic

## Public Repo Readiness

If you make the GitHub repository public, the project becomes easier to discover by developers and teams building agents. Before doing that, keep these basics aligned:

- remove or ignore any local-only files, logs, or database artifacts
- make sure the README matches the deployed behavior
- keep the landing page focused on fast technical evaluation and visible discovery contracts
- add repository topics such as `a2a`, `ai-agents`, `agent-infrastructure`, `typescript`, `fastify`, `trust`, `billing`, `risk-oracle`
- set the repository homepage to `https://ai-risk-oracle.fly.dev/`

## SDK

The package root exports the official TypeScript SDK after build/publish:

```ts
import { InterAIRiskOracleClient } from "ai-risk-oracle"
```

After `npm run build`, the compiled client is available at:

```text
dist/sdk/interai-risk-oracle.js
```

Example usage scripts:

```bash
npm run example:basic
npm run example:basic:prod
npm run typecheck:examples
```

## Python SDK

The repository also includes a minimal dependency-free Python client under `python/interai_risk_oracle`.

```bash
PYTHONPATH=python python examples/python_basic_agent.py
```

The Python example works with `ORACLE_API_KEY` for bearer prepaid calls. Without an API key it demonstrates the paid endpoint's `402` x402 payment requirements.

## Notes

- No sessions, no UI, no cookies
- Everything is stateless and API-driven
- Dev credit should be disabled in production
- `ALLOW_FAKE_TOPUP_CONFIRM=true` is for local testing only
- Signed receipts require `ORACLE_SIGNING_SECRET`

## Status

The repository is currently a working AI-to-AI economic primitive with:

- onboarding
- prepaid billing
- verification engine
- batch processing
- trust receipt persistence
- machine-readable discovery
- local billing regression smokes
