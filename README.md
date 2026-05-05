# InterAI Risk Oracle

Economic infrastructure for autonomous agents to verify response consistency, estimate hallucination risk, and exchange machine-readable trust evidence with prepaid billing.

## What This Is

InterAI Risk Oracle is an AI-to-AI service for systems that need to:

- evaluate prompt/response consistency
- estimate hallucination risk
- make automated decisions (`accept` / `review` / `reject`)
- pay per request with prepaid balance on Base USDC
- retrieve trust receipts for downstream audit or agent-to-agent verification

This is not a human-facing app. It is a machine-to-machine primitive.

## Core Capabilities

- Bearer API key authentication
- Prepaid account billing
- Per-request cost with microusdc precision
- Idempotent billing with `X-Idempotency-Key`
- Single and batch verification
- Onchain topups on Base USDC
- Account traceability via `/me`, `/ledger`, `/usage`
- Trust receipts via `/trust/receipts`
- Public canonical receipt lookup via `/trust/receipts/:receiptId`
- Signature verification via `/trust/verify-signature`
- Public JSON Schemas via `/schemas/trust-receipt.json`, `/schemas/trust-receipt-public.json`, and `/schemas/verify-result.json`
- Machine-readable discovery via `/.well-known`
- A2A discovery via `/.well-known/agent.json`
- A2A synchronous JSON-RPC endpoint at `/a2a`
- SDK compiled to `dist/sdk/interai-risk-oracle.js`

## Quick Start

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
curl -X GET http://localhost:3000/.well-known/ai-service.json
curl -X GET http://localhost:3000/.well-known/openapi.json
curl -X GET http://localhost:3000/.well-known/agent.json
curl -X GET http://localhost:3000/health
curl -X GET http://localhost:3000/ready
```

10. Call the minimal A2A endpoint with bearer auth:

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

## Local Verification

Run the local verification suite:

```bash
npm test
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

- `GET /.well-known/ai-service.json` exposes agent-oriented discovery metadata, billing conventions, schema URLs, and integration flow.
- `GET /.well-known/openapi.json` exposes the HTTP contract for tooling and SDK generation.
- `GET /.well-known/agent.json` exposes an A2A Agent Card at the recommended well-known location.
- `POST /a2a` exposes a minimal A2A-compatible JSON-RPC interface for synchronous `message/send` verification calls.
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
- `/.well-known/ai-service.json`
- `/.well-known/openapi.json`
- `/.well-known/agent.json`
- `POST /a2a`

This gives you a concrete funnel to watch:
- discovery document views
- agent card views
- A2A calls
- eventual onboardings and verification traffic

## Public Repo Readiness

If you make the GitHub repository public, the project becomes easier to discover by developers and teams building agents. Before doing that, keep these basics aligned:

- remove or ignore any local-only files, logs, or database artifacts
- make sure the README matches the deployed behavior
- add repository topics such as `a2a`, `ai-agents`, `agent-infrastructure`, `typescript`, `fastify`, `trust`, `billing`, `risk-oracle`
- set the repository homepage to `https://ai-risk-oracle.fly.dev/`

## SDK

After `npm run build`, the compiled client is available at:

```text
dist/sdk/interai-risk-oracle.js
```

Example usage scripts:

```bash
npm run example:basic
npm run example:basic:prod
```

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
