# API Reference

Base URL:

```text
https://ai-risk-oracle.fly.dev
```

## Authentication

```http
Authorization: Bearer <interai_credential>
```

## POST /verify

Verifies a proposed autonomous action before execution.

Request schema: [schemas/verify-request.schema.json](../schemas/verify-request.schema.json)

Response schema: [schemas/verify-response.schema.json](../schemas/verify-response.schema.json)

Example request:

```json
{
  "use_case": "agent-before-payment",
  "action": {
    "type": "payment",
    "description": "Release vendor payment",
    "amount_usd": 125
  },
  "context": {
    "agent_id": "agent_123",
    "counterparty_id": "vendor_agent_456"
  },
  "policy": {
    "max_risk_level": "medium",
    "require_trust_receipt": true
  }
}
```

Important response fields:

- `score`: normalized confidence score from 0 to 1.
- `risk_level`: `low`, `medium`, `high`, or `critical`.
- `signals`: public decision signals.
- `recommended_action`: `accept`, `review`, or `reject`.
- `trust_receipt_id`: receipt identifier when receipt creation is enabled.

## GET /trust-receipts/{id}

Retrieves public receipt metadata for an authorized account or integration.

## GET /discovery

Returns public discovery metadata for agent and developer integrations.

## Errors

- `400`: invalid request.
- `401`: missing or invalid authentication.
- `403`: account or policy access denied.
- `429`: rate limit exceeded.
- `500`: service unavailable or internal error.
