# 3 Decisions In 90 Seconds

InterAI Risk Oracle is an autonomous execution gateway for AI agents. Before an agent
executes, InterAI verifies the proposed action, applies policy enforcement, and returns
a decision with trust receipts for audit.

Use the hosted API with OpenAPI, A2A, MCP, x402, and Base USDC integration metadata.

## Controlled Demo Layer

Open:

```text
https://ai-risk-oracle.fly.dev/demo
```

The live demo is controlled. It creates a scoped `demo_trial` key, runs a safe
read-only sandbox verification through the existing `/verify` endpoint, and opens
the public trust receipt.

It does not:

- open anonymous unlimited `/verify`
- move funds
- confirm topups
- call external tools
- fetch arbitrary URLs
- bypass x402/payment requirements for non-trial traffic

Demo-trial keys are short-lived, low-quota, rate limited, stored hashed, shown
raw only once, and separated from paid adoption telemetry under
`traffic_segments.<window>.demo_trial`.

Current beta abuse controls are in-memory per process. A shared persistent rate
limit store is still needed for enterprise-grade abuse prevention.

## 1. Safe Read-Only Lookup -> allow

Situation: an agent wants to read order status from an internal system.

Request summary:

```json
{
  "use_case": "agent-before-tool-execution",
  "action": {
    "type": "read_only_lookup",
    "name": "check_order_status",
    "external_side_effect": false,
    "irreversible": false
  },
  "context": {
    "environment": "sandbox",
    "user_confirmation": true
  },
  "policy": {
    "max_risk_level": "medium",
    "require_trust_receipt": true
  }
}
```

Response summary:

```json
{
  "request_contract": "autonomous_execution",
  "score": 0.34,
  "risk_level": "low",
  "recommended_action": "allow",
  "policy_result": "allow",
  "signals": {},
  "trust_receipt_id": "..."
}
```

What the agent should do next: execute the lookup and store the trust receipt.

## 2. Payment In Production -> review_required

Situation: an agent wants to release a vendor payment in production.

Request summary:

```json
{
  "use_case": "agent-before-payment",
  "action": {
    "type": "payment",
    "name": "release_vendor_payment",
    "amount_usd": 125,
    "external_side_effect": true,
    "irreversible": false
  },
  "context": {
    "environment": "production",
    "counterparty_id": "vendor_agent_456",
    "user_confirmation": false
  },
  "policy": {
    "max_risk_level": "medium",
    "require_trust_receipt": true,
    "amount_usd_limit": 500
  }
}
```

Response summary:

```json
{
  "request_contract": "autonomous_execution",
  "risk_level": "medium",
  "recommended_action": "review_required",
  "policy_result": "review_required",
  "signals": {},
  "trust_receipt_id": "..."
}
```

What the agent should do next: pause execution and route to a supervisor agent, policy
system, wallet rule, governance queue, or human operator.

## 3. Irreversible Transfer -> block

Situation: an agent wants to send a large irreversible transfer to an external
counterparty.

Request summary:

```json
{
  "use_case": "agent-before-payment",
  "action": {
    "type": "irreversible_transfer",
    "name": "send_large_transfer",
    "amount_usd": 2500,
    "external_side_effect": true,
    "irreversible": true
  },
  "context": {
    "environment": "production",
    "counterparty_id": "unknown_counterparty",
    "user_confirmation": false
  },
  "policy": {
    "max_risk_level": "medium",
    "require_trust_receipt": true,
    "amount_usd_limit": 500,
    "blocked_action_types": ["irreversible_transfer"]
  }
}
```

Response summary:

```json
{
  "request_contract": "autonomous_execution",
  "recommended_action": "block",
  "policy_result": "block",
  "policy_violations": [
    {
      "code": "blocked_action_type"
    }
  ],
  "signals": {},
  "trust_receipt_id": "..."
}
```

What the agent should do next: abort the action, log the decision, and store the trust
receipt.

## What Should The Agent Do Next?

- allow: execute the action and store the trust receipt.
- review_required: pause execution and route to a supervisor agent, policy
  system, wallet rule, governance queue, or human operator.
- block: abort the action, log the decision, and store the trust receipt.
