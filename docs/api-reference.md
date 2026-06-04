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
    "name": "release_vendor_payment",
    "description": "Release vendor payment",
    "amount_usd": 125,
    "currency": "USD",
    "irreversible": false,
    "external_side_effect": true
  },
  "context": {
    "agent_id": "agent_123",
    "environment": "production",
    "counterparty_id": "vendor_agent_456",
    "user_confirmation": false
  },
  "policy": {
    "max_risk_level": "medium",
    "require_trust_receipt": true,
    "amount_usd_limit": 500,
    "blocked_action_types": ["irreversible_transfer"],
    "require_human_review_above": 0.75
  }
}
```

Important response fields:

- `request_contract`: `autonomous_execution`.
- `score`: risk score from 0 to 1, where higher means higher execution risk.
- `risk_level`: `low`, `medium`, or `high`.
- `signals`: machine-readable object with execution-risk signals.
- `recommended_action`: `allow`, `review_required`, or `block`.
- `policy_result`: `allow`, `review_required`, or `block`.
- `policy_violations`: machine-readable policy violations.
- `trust_receipt_id`: receipt identifier when receipt creation is enabled.

## GET /trust/receipts/{receiptId}

Retrieves the canonical public trust receipt representation by receipt ID.

## GET /.well-known/ai-service.json

Returns public discovery metadata for agent and developer integrations. The
hosted API also exposes discovery aliases such as `/.well-known/ai-risk-oracle`,
`/.well-known/openapi.json`, `/openapi.json`, and `/discovery.json`.

## Errors

- `400`: invalid request.
- `401`: missing or invalid authentication.
- `403`: account or policy access denied.
- `429`: rate limit exceeded.
- `500`: service unavailable or internal error.
