# Quickstart

This guide takes a new integrator from a local server to a billed verification,
trust receipt lookup, and SDK usage path.

For the live deployment, start with:

```bash
curl -sS https://ai-risk-oracle.fly.dev/health
curl -sS https://ai-risk-oracle.fly.dev/pricing
curl -sS https://ai-risk-oracle.fly.dev/.well-known/discovery-bundle.json
```

## 1. Run The API

```bash
npm install
npm run dev
```

For a safe local setup, keep development funding enabled and avoid fake onchain
confirmation in production:

```env
PAYMENT_MODE=file
DEV_TOPUP_ENABLED=true
ONBOARDING_ENABLED=true
ALLOW_FAKE_TOPUP_CONFIRM=false
```

Production deployments should use `PAYMENT_MODE=onchain`,
`TOPUP_RECEIVE_ADDRESS`, and `BASE_RPC_URL`.

## 2. Create An Account

```bash
curl -sS -X POST http://localhost:3000/onboard \
  -H "Content-Type: application/json" \
  -d '{"name":"quickstart-agent"}'
```

Save the returned `api_key`. All paid endpoints use:

```http
Authorization: Bearer YOUR_API_KEY
```

## 3. Fund The Account

Local development:

```bash
curl -sS -X POST http://localhost:3000/topup/dev/credit \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"amount_usdc":"0.01"}'
```

Onchain production:

```bash
curl -sS -X POST http://localhost:3000/topup/create \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"amount_usdc":"0.01"}'
```

After sending Base USDC to the returned address, confirm the top-up:

```bash
curl -sS -X POST http://localhost:3000/topup/confirm \
  -H "X-Topup-Id: YOUR_TOPUP_ID" \
  -H "X-Tx-Hash: YOUR_BASE_USDC_TX_HASH"
```

## 4. Verify One Response

Use a stable `X-Idempotency-Key` for retries. Reusing the same key for the same
operation prevents duplicate billing.

```bash
curl -sS -X POST http://localhost:3000/verify \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -H "X-Idempotency-Key: quickstart-verify-1" \
  -d '{
    "prompt": "What is the capital of France?",
    "response": "Paris",
    "domain": "general"
  }'
```

The response includes:

- `consistency_score`
- `hallucination_risk`
- `risk_level`
- `trust_score`
- `trust_recommended_action`
- `signals`
- `historical_context`
- `trust_receipt`

## 4a. Inspect x402 Payment Requirements

Paid endpoints also support x402. Without bearer auth, the API returns `402`
and a `PAYMENT-REQUIRED` header:

```bash
curl -i -sS -X POST http://localhost:3000/verify \
  -H "Content-Type: application/json" \
  -d '{
    "prompt": "What is 2 + 2?",
    "response": "4",
    "domain": "math"
  }'
```

For a decoded TypeScript example:

```bash
npm run example:x402
```

## 5. Verify A Batch

```bash
curl -sS -X POST http://localhost:3000/verify/batch \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -H "X-Idempotency-Key: quickstart-batch-1" \
  -d '{
    "items": [
      {
        "prompt": "What is the capital of France?",
        "response": "Paris",
        "domain": "general"
      },
      {
        "prompt": "What is 2 + 2?",
        "response": "4",
        "domain": "math"
      }
    ]
  }'
```

Batch requests support up to 100 items.

## 6. Fetch Trust Evidence

List private receipts for the authenticated account:

```bash
curl -sS "http://localhost:3000/trust/receipts?limit=10" \
  -H "Authorization: Bearer YOUR_API_KEY"
```

Inspect historical trust reputation:

```bash
curl -sS "http://localhost:3000/trust/reputation?domains_limit=20" \
  -H "Authorization: Bearer YOUR_API_KEY"
```

Fetch the canonical public representation of one receipt:

```bash
curl -sS http://localhost:3000/trust/receipts/YOUR_RECEIPT_ID
```

Verify a signed receipt when `ORACLE_SIGNING_SECRET` is configured:

```bash
curl -sS -X POST http://localhost:3000/trust/verify-signature \
  -H "Content-Type: application/json" \
  -d '{
    "receipt": {
      "receipt_id": "YOUR_RECEIPT_ID",
      "issued_at": "2026-01-01T00:00:00.000Z",
      "oracle_version": "0.0.1",
      "signals_version": "signals-v1",
      "request_hash": "REQUEST_HASH",
      "decision_basis": {
        "dominant_negatives": [],
        "dominant_positives": []
      }
    },
    "signature": "HEX_SIGNATURE",
    "signature_alg": "hmac-sha256"
  }'
```

## 7. Use The SDK

Build the SDK:

```bash
npm run build
```

Import from the package root after publishing, or from the local source during
development:

```ts
import { InterAIRiskOracleClient } from "ai-risk-oracle"

const client = new InterAIRiskOracleClient({
  baseUrl: "http://localhost:3000",
  apiKey: process.env.ORACLE_API_KEY
})

const result = await client.verify(
  {
    prompt: "What is the capital of France?",
    response: "Paris",
    domain: "general"
  },
  "sdk-verify-1"
)

console.log(result.trust_score, result.trust_receipt.receipt_id)
```

Local examples:

```bash
npm run example:basic
npm run example:pre-payment
npm run example:pre-tool
npm run example:mcp-agent
npm run example:a2a-agent
npm run python:sdk
npm run smoke:sdk
```

The agent-native examples use `ORACLE_API_KEY` for bearer prepaid calls. Create
and fund an account first, or point them at a funded production account.

Python usage is available without extra dependencies:

```bash
PYTHONPATH=python python examples/python_basic_agent.py
```

## 8. Discover Machine Contracts

```bash
curl -sS http://localhost:3000/.well-known/ai-service.json
curl -sS http://localhost:3000/.well-known/openapi.json
curl -sS http://localhost:3000/.well-known/agent.json
curl -sS http://localhost:3000/.well-known/discovery-bundle.json
curl -sS http://localhost:3000/pricing
curl -sS http://localhost:3000/schemas/verify-result.json
```

## 9. Troubleshooting

- `401 invalid_api_key`: create an account with `/onboard` and send `Authorization: Bearer <api_key>`.
- `402 insufficient_balance`: fund the account with `/topup/dev/credit` locally or `/topup/create` in production.
- `receipt_signing_not_configured`: set `ORACLE_SIGNING_SECRET` before expecting signed receipts.
- Duplicate retries should reuse the same `X-Idempotency-Key`.

## 10. Benchmark The Current Trust Layer

```bash
npm run benchmark
```

The benchmark covers 30 trust-layer scenarios across supported, uncertain, and
risky agent outputs. It reports calibration gaps, false positives, and false
negatives without failing the build unless the script itself breaks.
