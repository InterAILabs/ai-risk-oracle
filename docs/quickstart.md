# Quickstart

This guide shows how an autonomous agent can verify an action before execution using the
hosted InterAI Risk Oracle API.

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

Use self-serve onboarding for an API key and trial/prepaid balance, or use x402 where
supported. Email interailabs@gmail.com is available for support, security, enterprise,
partnerships, or manual integration help; it is not required for the default self-serve
path.

## 2. Verify Before Execution

```bash
curl -sS -X POST https://ai-risk-oracle.fly.dev/verify \
  -H "Authorization: Bearer <interai_credential>" \
  -H "Content-Type: application/json" \
  -d '{
    "use_case": "agent-before-tool-execution",
    "action": {
      "type": "tool_call",
      "name": "send_payment",
      "description": "Send payment after autonomous vendor delivery",
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
  }'
```

## 3. Use The Decision

The response `score` is a risk score from 0 to 1. Higher values mean higher execution
risk.

- `allow`: proceed automatically.
- `review_required`: the current agent should not execute autonomously under
  the current policy; route to a supervisor agent, policy system, wallet rule,
  governance queue, or human operator.
- `block`: block execution.

## 4. Store The Receipt

If `trust_receipt_id` is present, store it with the downstream action record. Receipts
help prove that verification happened before execution.
