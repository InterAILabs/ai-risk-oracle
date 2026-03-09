# InterAI Risk Oracle

AI-to-AI infrastructure service for **response consistency and hallucination risk detection**.

This API allows agents, applications, and LLM pipelines to **verify the reliability of an AI-generated response** before trusting it.

The service is **payment-gated** using a machine-to-machine micropayment model.

---

## Live API

`https://ai-risk-oracle.fly.dev`

Health check:

`GET /health`

---

## Core Concept

Agents can call this API to ask:

> "Is this response internally consistent and reliable?"

The API returns a **risk score** and recommendation.

Example output:

```json
{
  "consistency_score": 0.83,
  "hallucination_risk": 0.17,
  "risk_level": "low",
  "recommended_action": "accept"
}
Payment Model

The API uses a 402-style payment flow.

Workflow:

Agent
│
▼
POST /quote
│
▼
receive payment_reference
│
▼
pay
│
▼
POST /verify
Header: X-Payment-Ref
Payment

Current public deployment uses file-mode payment confirmation for MVP testing.
Real onchain verification on Base is the next step.

The API uses USDC on Base.

Token
USDC
0x833589fcd6edb6e08f4c7c32d4f71b54bda02913

Network
Base
chain_id: 8453

The client must transfer the quoted amount to the address returned by /quote.

After payment, call /verify using the payment_reference.

Pricing
Mode	Price
fast	0.0006 USDC
batch	0.0004 USDC per item
Stats

GET /stats

Returns basic service metrics:

quotes issued

payments confirmed

verifications executed

Quickstart (2 minutes)
1. Request a quote
curl https://ai-risk-oracle.fly.dev/quote \
-X POST \
-H "Content-Type: application/json" \
-d '{
  "prompt": "What is the capital of France?",
  "response": "Paris is the capital of France.",
  "mode": "fast"
}'

Example response:

{
  "payment_reference": "abc123",
  "amount": "0.0006",
  "currency": "USDC"
}
2. Verify response
curl https://ai-risk-oracle.fly.dev/verify \
-X POST \
-H "Content-Type: application/json" \
-H "X-Payment-Ref: abc123" \
-d '{
  "prompt": "What is the capital of France?",
  "response": "Paris is the capital of France."
}'

Response:

{
  "consistency_score": 0.83,
  "hallucination_risk": 0.17,
  "risk_level": "low",
  "recommended_action": "accept"
}
Endpoints
Health

GET /health

Returns service status.

Quote

POST /quote

Request:

{
  "prompt": "...",
  "response": "...",
  "mode": "fast"
}

Returns payment quote.

Verify

POST /verify

Headers:

X-Payment-Ref: <payment_reference>

Request:

{
  "prompt": "...",
  "response": "...",
  "domain": "general"
}
Verify Batch

POST /verify/batch

Request:

{
  "items": [
    {
      "prompt": "...",
      "response": "...",
      "domain": "general"
    }
  ]
}
Public Example

Run the public example locally:

npm run example
Smoke Test

Run the smoke test:

npm run smoke
OpenAPI

Machine-readable API specification:

/.well-known/openapi.json

AI Service Discovery

Agents can discover this service via:

/.well-known/ai-service.json

SDK Example (TypeScript)
import { quote, verify } from "./sdk/interai-risk-oracle"

const base = "https://ai-risk-oracle.fly.dev"

const q = await quote(base, prompt, response)
const result = await verify(base, q.payment_reference, prompt, response)

console.log(result)
Use Cases

LLM output validation

hallucination detection

AI agent self-checking

multi-agent verification

safety guardrails

Performance

Load tests (local benchmark):

~900 requests/sec

p95 latency ~125ms

Architecture
Client / Agent
│
▼
AI Risk Oracle API
│
▼
Heuristic engine
License

MIT