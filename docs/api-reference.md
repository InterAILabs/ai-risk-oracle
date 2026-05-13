# API Reference

InterAI Risk Oracle exposes HTTP, A2A, and MCP interfaces over the same prepaid
account model.

## Base URLs

Local development:

```text
http://localhost:3000
```

Production example:

```text
https://ai-risk-oracle.fly.dev
```

Machine-readable contracts:

- `GET /.well-known/openapi.json`
- `GET /.well-known/ai-service.json`
- `GET /.well-known/agent.json`
- `GET /.well-known/discovery-bundle.json`
- `GET /pricing`

## Authentication

Paid endpoints use bearer API keys:

```http
Authorization: Bearer YOUR_API_KEY
```

Create a key with:

```http
POST /onboard
```

Idempotent paid calls should include:

```http
X-Idempotency-Key: stable-operation-id
```

## Core HTTP Endpoints

### `POST /onboard`

Creates an account and API key when onboarding is enabled.

Request:

```json
{
  "name": "example-agent",
  "api_key_name": "default"
}
```

Response includes:

- `account`
- `api_key`
- `balance`
- `funding`
- `trial`

### `GET /me`

Returns the authenticated account profile, balance, and API key metadata.

### `POST /topup/create`

Creates a Base USDC top-up intent.

Request:

```json
{
  "amount_usdc": "0.01"
}
```

### `POST /topup/confirm`

Confirms an onchain top-up after payment is sent.

Headers:

```http
X-Topup-Id: YOUR_TOPUP_ID
X-Tx-Hash: YOUR_BASE_USDC_TX_HASH
```

### `POST /verify`

Bills one verification and returns risk, trust signals, and a trust receipt.

Request:

```json
{
  "prompt": "What is the capital of France?",
  "response": "Paris",
  "domain": "general"
}
```

Important response fields:

- `consistency_score`: prompt/response consistency from `0` to `1`.
- `hallucination_risk`: estimated risk from `0` to `1`.
- `risk_level`: `low`, `medium`, or `high`.
- `recommended_action`: `accept`, `review`, or `reject`.
- `trust_score`: weighted trust score from `0` to `1`.
- `trust_recommended_action`: trust-specific action.
- `confidence_band`: `low`, `medium`, or `high`.
- `signals`: machine-readable signal breakdown.
- `historical_context`: prior account/domain trust history when available.
- `trust_receipt`: canonical evidence payload plus signature metadata.

### `POST /verify/batch`

Bills one batch verification. Supports up to 100 items.

Request:

```json
{
  "items": [
    {
      "prompt": "What is the capital of France?",
      "response": "Paris",
      "domain": "general"
    }
  ]
}
```

Response includes:

- `batch_size`
- `billed`
- `results`
- `summary`
- `oracle`

### `GET /trust/receipts`

Lists trust receipts for the authenticated account.

Query:

```text
limit=10
```

### `GET /trust/reputation`

Returns historical trust reputation for the authenticated account, including
overall aggregates and per-domain aggregates.

Query:

```text
domains_limit=20
```

Important response fields:

- `sample_size`: number of receipts included.
- `reputation_score`: average trust score penalized by high-risk rate.
- `average_trust_score`: raw average trust score.
- `high_risk_rate`: share of receipts with high risk.
- `domains`: per-domain reputation breakdown.

### `GET /trust/receipts/:receiptId`

Returns the canonical public receipt representation for downstream audit.

### `POST /trust/verify-signature`

Verifies a signed trust receipt when receipt signing is configured.

Request:

```json
{
  "receipt": {
    "receipt_id": "receipt-id",
    "issued_at": "2026-01-01T00:00:00.000Z",
    "oracle_version": "0.0.1",
    "signals_version": "signals-v1",
    "request_hash": "request-hash",
    "decision_basis": {
      "dominant_negatives": [],
      "dominant_positives": []
    }
  },
  "signature": "hex-signature",
  "signature_alg": "hmac-sha256"
}
```

## Schemas

Public JSON Schemas:

- `GET /schemas/verify-result.json`
- `GET /schemas/trust-receipt.json`
- `GET /schemas/trust-receipt-public.json`

Use these schemas for validation, SDK generation, or agent-side contract checks.

## Pricing

`GET /pricing` returns:

- currency and chain metadata
- verify cost
- batch pricing model
- top-up endpoints
- trial metadata
- idempotency conventions

Current defaults:

```text
verify: 0.0006 USDC
verify_batch: 0.0006 USDC base + 0.0002 USDC per item
```

## A2A

Discovery:

```http
GET /.well-known/agent.json
```

Endpoint:

```http
POST /a2a
```

Supported method:

```text
message/send
```

Verification payloads can be sent as `data` parts:

```json
{
  "jsonrpc": "2.0",
  "id": "verify-1",
  "method": "message/send",
  "params": {
    "message": {
      "role": "user",
      "messageId": "client-message-1",
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
      "idempotency_key": "a2a-verify-1"
    }
  }
}
```

## MCP

Endpoint:

```http
POST /mcp
```

Supported methods:

- `initialize`
- `notifications/initialized`
- `tools/list`
- `tools/call`
- `resources/list`
- `resources/read`
- `prompts/list`
- `prompts/get`

Public discovery tools do not require account balance. Paid verification tools
require bearer auth.

Core tools:

- `oracle.verify_response`
- `oracle.verify_batch`
- `oracle.get_pricing`
- `oracle.discovery_bundle`
- `oracle.service_descriptor`
- `oracle.agent_card`
- `oracle.get_trust_receipt`
- `oracle.verify_trust_receipt_signature`

## SDK

After `npm run build`, TypeScript consumers can import the client and response
types from the package root:

```ts
import {
  InterAIRiskOracleClient,
  type VerifyResult
} from "ai-risk-oracle"
```

Basic usage:

```ts
const client = new InterAIRiskOracleClient({
  baseUrl: "http://localhost:3000",
  apiKey: process.env.ORACLE_API_KEY
})

const result: VerifyResult = await client.verify(
  {
    prompt: "What is the capital of France?",
    response: "Paris",
    domain: "general"
  },
  "verify-1"
)
```

The package-style TypeScript example is available at
`examples/sdk-package-consumer.ts` and can be checked with:

```bash
npm run typecheck:examples
```

## Error Model

Common HTTP errors:

- `400`: malformed request, invalid batch, or ambiguous payment mode.
- `401`: missing or invalid API key.
- `402`: insufficient balance or payment required.
- `404`: receipt or top-up not found.
- `503`: receipt signing unavailable or request timeout.

JSON-RPC interfaces return JSON-RPC error envelopes with service-specific
details in `error.data`.
