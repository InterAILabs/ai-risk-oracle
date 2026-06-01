# Quickstart

This guide shows how an autonomous agent can verify an action before execution
using the hosted InterAI Risk Oracle API.

## 1. Get API Access

Request beta access through the public repository support channel and keep your
credential in your own secret manager.

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
      "description": "Send payment after autonomous vendor delivery"
    },
    "context": {
      "agent_id": "agent_123",
      "environment": "production"
    },
    "policy": {
      "max_risk_level": "medium",
      "require_trust_receipt": true
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
