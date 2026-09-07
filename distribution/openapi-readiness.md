# OpenAPI Readiness

InterAI Risk Oracle exposes the hosted OpenAPI contract at:

- `https://ai-risk-oracle.fly.dev/.well-known/openapi.json`
- `https://ai-risk-oracle.fly.dev/openapi.json`

The hosted contract is OpenAPI 3.1.0.

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

Before submitting the API contract to a partner or directory:

1. Fetch both OpenAPI URLs.
2. Confirm `openapi` is `3.1.0`.
3. Confirm the service description uses **Independent pre-execution decision layer for consequential agent actions** and does not claim that InterAI executes the external action.
4. Confirm `signals` is represented as an object in examples and schemas.
5. Confirm the score description says higher means more risk.
6. Confirm legacy compatibility is not the primary narrative.
7. Confirm the documented request shape matches current runtime behavior, including `external_evidence` when the Stage 2 contract is advertised.

## APIs.guru Status

Historical submission issue:

```text
https://github.com/APIs-guru/openapi-directory/issues/2665
```

Do not claim approval or listing until APIs.guru explicitly confirms acceptance. Verify the
external issue state again before any current distribution claim.

## 2026-09-07 Audit Gate

The production deployment at commit `96276a24b1fdc9f06c9880f4820b206ce0ef1308`
passed CI and the Fly production smoke. The active OpenAPI source still carries the older
`Autonomous Execution Gateway` wording in `info.description`, while Stage 2
`external_evidence` runtime support is not yet represented in the OpenAPI request schema.

Treat that as a **distribution blocker**, not a runtime blocker: do not submit the OpenAPI
contract to new directories until the hosted description and request documentation are
aligned and revalidated. This note should be removed only after a production smoke confirms
the corrected hosted contract.

## Validation

Run current OpenAPI validation immediately before distribution. Historical validator
results are useful regression evidence but are not a substitute for validating the exact
hosted contract being submitted.
