# InterAI Risk Oracle

Economic infrastructure for autonomous agents to verify response consistency and hallucination risk with prepaid billing.

---

## What this is

InterAI Risk Oracle is an AI-to-AI service that allows agents and systems to:

- evaluate prompt/response consistency
- estimate hallucination risk
- take automated decisions (accept / reject / review)
- pay per request using prepaid balance (USDC on Base)

This is not a user-facing app.  
It is a **machine-to-machine primitive**.

---

## Core capabilities

- Bearer API key authentication
- Prepaid balance billing
- Per-request cost (microusdc precision)
- Idempotent requests
- Batch verification
- Onchain funding (USDC on Base)
- Full economic traceability (`/ledger`, `/usage`)
- Machine-readable discovery (`/.well-known`)

---

## Fastest integration (AI-to-AI)

### 1. Onboard

```bash
curl -X POST http://localhost:3000/onboard \
  -H "Content-Type: application/json" \
  -d '{"name":"demo-agent"}'

Returns:

account
api_key
balance
funding instructions
ready-to-use curl examples
2. Check account
curl -X GET http://localhost:3000/me \
  -H "Authorization: Bearer YOUR_API_KEY"
3. Fund account
Local / dev
curl -X POST http://localhost:3000/topup/dev/credit \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"amount_usdc":"0.01"}'
Production (onchain)
curl -X POST http://localhost:3000/topup/create \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"amount_usdc":"0.01"}'

Then:

curl -X POST http://localhost:3000/topup/confirm \
  -H "X-Topup-Id: YOUR_TOPUP_ID" \
  -H "X-Tx-Hash: YOUR_BASE_USDC_TX_HASH"
4. Verify a response
curl -X POST http://localhost:3000/verify \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -H "X-Idempotency-Key: example-1" \
  -d '{
    "prompt": "What is the capital of France?",
    "response": "Paris",
    "domain": "general"
  }'
5. Batch verify
curl -X POST http://localhost:3000/verify/batch \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -H "X-Idempotency-Key: example-batch-1" \
  -d '{
    "items": [
      { "prompt": "What is the capital of France?", "response": "Paris" },
      { "prompt": "2 + 2 = ?", "response": "4" }
    ]
  }'
Inspect economic state
Account
curl -X GET http://localhost:3000/me \
  -H "Authorization: Bearer YOUR_API_KEY"
Ledger (credits / debits)
curl -X GET "http://localhost:3000/ledger?limit=10" \
  -H "Authorization: Bearer YOUR_API_KEY"
Usage (service consumption)
curl -X GET "http://localhost:3000/usage?limit=10" \
  -H "Authorization: Bearer YOUR_API_KEY"
Discovery (for agents)
/.well-known/ai-service.json
/.well-known/openapi.json

These allow automated systems to:

discover endpoints
understand billing model
integrate without manual docs
Billing model
currency: USDC
chain: Base
unit: microusdc (1e-6 USDC)
model: prepaid balance
debit: per request

Example:

verify: ~0.0006 USDC
verify_batch: dynamic based on size
Idempotency

Supported via:

X-Idempotency-Key

Prevents duplicate billing on retries.

Auth
Authorization: Bearer <api_key>

Obtained via:

POST /onboard
Notes
This system is designed for AI agents, not end users
No session, no UI, no cookies
Everything is stateless + API driven
Dev credit must be disabled in production
Onchain funding is the canonical production flow
Status

Core system implemented:

onboarding
prepaid billing
verification engine
batch processing
economic tracking
discovery layer
SDK example

This repository represents a working AI-to-AI economic primitive.