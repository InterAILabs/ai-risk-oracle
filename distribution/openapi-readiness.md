# OpenAPI Readiness

InterAI Risk Oracle exposes the hosted OpenAPI contract at:

- `https://ai-risk-oracle.fly.dev/.well-known/openapi.json`
- `https://ai-risk-oracle.fly.dev/openapi.json`

## Primary Contract

The primary request contract is `autonomous_execution`.

Example request:

```json
{
  "use_case": "agent-before-tool-execution",
  "action": {
    "type": "read_only_lookup",
    "name": "check_order_status",
    "description": "Read order status from an internal system",
    "external_side_effect": false,
    "irreversible": false
  },
  "context": {
    "agent_id": "agent_demo_safe",
    "environment": "sandbox",
    "user_confirmation": true
  },
  "policy": {
    "max_risk_level": "medium",
    "require_trust_receipt": true,
    "require_human_review_above": 0.75
  }
}
```

Example response:

```json
{
  "decision_id": "...",
  "request_contract": "autonomous_execution",
  "score": 0.34,
  "risk_level": "low",
  "signals": {},
  "recommended_action": "allow",
  "policy_result": "allow",
  "policy_violations": [],
  "trust_receipt_id": "..."
}
```

## Operator Check

Before submitting the API contract to a partner:

1. Fetch both OpenAPI URLs.
2. Confirm the service title and description say Autonomous Execution Gateway.
3. Confirm `signals` is represented as an object in examples and schemas.
4. Confirm the score description says higher means more risk.
5. Confirm legacy compatibility is not the primary narrative.

