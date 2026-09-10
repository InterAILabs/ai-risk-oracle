# Quickstart

This guide shows how an autonomous agent can verify a consequential action before execution using the hosted InterAI API.

## 1. Get API Access

Use the default self-serve path:

```text
pricing -> onboard/API key/trial or x402 -> verify -> receipt
```

Discover pricing and onboarding from the hosted API:

```text
https://ai-risk-oracle.fly.dev/pricing
https://ai-risk-oracle.fly.dev/onboard
```

Use self-serve onboarding for an API key and trial/prepaid balance, or use x402 where supported. Email interailabs@gmail.com is available for support, security, enterprise, partnerships, or manual integration help; it is not required for the default self-serve path.

## 2. Verify Before Execution

```bash
curl -sS -X POST https://ai-risk-oracle.fly.dev/verify \
  -H "Authorization: Bearer <interai_credential>" \
  -H "Content-Type: application/json" \
  -H "X-Idempotency-Key: quickstart-operation-1" \
  -d '{
    "use_case": "agent-before-payment",
    "action": {
      "type": "payment",
      "name": "release_vendor_payment",
      "description": "Release payment after autonomous vendor delivery",
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
      "require_trust_receipt": true,
      "amount_usd_limit": 500,
      "allowed_action_types": ["payment"],
      "blocked_action_types": ["irreversible_transfer"]
    }
  }'
```

For new integrations, prefer direct policy constraints that express the actual execution boundary: allowed/blocked action types, monetary limits, confirmation requirements, and receipt requirements.

## 3. Route On The Authority Decision

The primary execution contract is the final authority result:

- `allow`: the execution layer may proceed under the effective policy.
- `review_required`: the current agent is not authorized to continue autonomously; route to a supervisor agent, policy system, wallet rule, governance queue, or human operator.
- `block`: abort the proposed action.

The hosted beta also returns current compatibility fields such as `score`, `risk_level`, and machine-readable signals. They may be useful for diagnostics or existing integrations, but new execution logic should not treat a scalar score as the authority boundary. Route on the final `allow / review_required / block` decision and applicable policy result.

## 4. Store The Receipt

If `trust_receipt_id` is present, store it with the downstream action record. Receipts help prove that InterAI evaluated the proposed action before execution and preserve decision/policy evidence for retries, handoffs, governance, and later audit.
