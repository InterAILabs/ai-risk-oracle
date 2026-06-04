# Quickstart

This guide shows how an autonomous agent can verify an action before execution
using the hosted InterAI Risk Oracle API.

## 1. Get API Access

Request beta access at interailabs@gmail.com and keep your credential in your
own secret manager.

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

- `allow`: proceed automatically.
- `review_required`: pause and route to human or policy review.
- `block`: block execution.

## 4. Store The Receipt

If `trust_receipt_id` is present, store it with the downstream action record.
Receipts help prove that verification happened before execution.
