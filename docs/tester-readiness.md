# Tester Readiness Pack

Before an agent executes, InterAI verifies.

InterAI Risk Oracle is a hosted Autonomous Execution Gateway for pre-execution
verification of autonomous agents. It checks a proposed action before execution
and returns a machine-readable decision: `allow`, `review_required`, or `block`.

## What You Can Test Today

- Hosted liveness and readiness: `/health` and `/ready`.
- Discovery and OpenAPI: `/.well-known/openapi.json`,
  `/.well-known/ai-service.json`, `/.well-known/agent.json`, and
  `/.well-known/discovery-bundle.json`.
- Autonomous action verification through `POST /verify`.
- Policy enforcement for action type, risk level, amount, review threshold, and
  irreversible actions.
- Trust receipt creation and lookup.
- TypeScript SDK integration.
- Python client integration.

## Three Core Test Cases

### 1. Read-Only Lookup

Expected decision: `allow`.

Use this case when an agent wants to read data without external side effects:

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

Agent behavior: execute the lookup and store the trust receipt.

### 2. Payment

Expected decision: `review_required`.

Use this case when an agent wants to release funds in production:

```json
{
  "use_case": "agent-before-payment",
  "action": {
    "type": "payment",
    "name": "release_vendor_payment",
    "description": "Release payment to a vendor agent after delivery validation",
    "amount_usd": 125,
    "currency": "USDC",
    "external_side_effect": true,
    "irreversible": false
  },
  "context": {
    "agent_id": "agent_demo_payment",
    "environment": "production",
    "user_confirmation": false
  },
  "policy": {
    "max_risk_level": "medium",
    "amount_usd_limit": 500,
    "require_human_review_above": 0.75
  }
}
```

Agent behavior: pause execution and request review.

### 3. Irreversible Transfer

Expected decision: `block`.

Use this case when an agent proposes a blocked irreversible transfer:

```json
{
  "use_case": "agent-before-tool-execution",
  "action": {
    "type": "irreversible_transfer",
    "name": "transfer_customer_funds",
    "description": "Irreversibly transfer customer funds to an external wallet",
    "amount_usd": 125,
    "currency": "USDC",
    "external_side_effect": true,
    "irreversible": true
  },
  "context": {
    "agent_id": "agent_demo_block",
    "environment": "production",
    "user_confirmation": false
  },
  "policy": {
    "max_risk_level": "medium",
    "blocked_action_types": ["irreversible_transfer"],
    "require_user_confirmation_for_irreversible": true,
    "require_human_review_above": 0.75
  }
}
```

Agent behavior: abort the action, log the decision, and store the trust receipt
if one was issued.

## Decision Handling

- `allow`: execute and store the receipt.
- `review_required`: pause and request human or operator review.
- `block`: abort and log.

## What InterAI Does Not Promise Yet

- It does not guarantee universal truth.
- It does not replace human audit for critical actions.
- It does not expose the production verification engine.
- It is not a local open source library.

## Feedback To Send

- Is the `autonomous_execution` contract clear?
- How easy is integration through OpenAPI, A2A, MCP, TypeScript, or Python?
- Are trust receipts useful for your audit or governance flow?
- Which policy fields are missing?
- Where does onboarding feel slow or confusing?
- Which action types matter most for your agents?

## Beta Access

Request beta/API access at interailabs@gmail.com.
