# Tester Readiness Pack

Before an agent executes, InterAI verifies.

InterAI Risk Oracle is a hosted **pre-execution decision layer** for consequential autonomous-agent actions. It sits after identity/permission checks and before execution, and returns a machine-readable authority decision: `allow`, `review_required`, or `block`.

The core question is not only whether an agent is technically permitted to act. It is whether **this exact proposed action should execute now, in this context, under this policy**.

## What You Can Test Today

- Hosted liveness and readiness: `/health` and `/ready`.
- Discovery and OpenAPI: `/.well-known/openapi.json`, `/.well-known/ai-service.json`, `/.well-known/agent.json`, and `/.well-known/discovery-bundle.json`.
- Autonomous action verification through `POST /verify`.
- Policy enforcement for action type, risk level, amount, review threshold, and irreversible actions.
- `allow`, `review_required`, and `block` handling before execution.
- Signed trust receipt creation, lookup, and signature verification.
- TypeScript SDK integration.
- Python client integration.
- MCP and A2A hosted interfaces where documented.

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

Agent behavior: pause execution and route to a supervisor agent, policy system, wallet rule, governance queue, or human operator.

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

Agent behavior: abort the action, log the decision, and store the trust receipt if one was issued.

## Decision Handling

- `allow`: execute and store the receipt.
- `review_required`: the current agent should not execute autonomously under the current policy; route to a supervisor agent, policy system, wallet rule, governance queue, or human operator.
- `block`: abort and log.

## What InterAI Is Not

InterAI is not intended to replace authentication, identity, deterministic permissions, domain regulation, or mandatory human controls. Those layers answer different questions.

It also does not guarantee universal factual truth. A trust receipt records the decision InterAI made and the material associated with that decision; it does not certify that every underlying assertion is true.

## Current Architectural Boundary

The public `autonomous_execution` contract is the primary product surface. The service also retains an earlier prompt/response verification contract for compatibility.

The autonomous contract should be evaluated as a pre-execution boundary, not as a generic hallucination checker or broad AI-safety product.

## Feedback To Send

- Is the `autonomous_execution` contract clear?
- Does the identity/permission/decision-layer separation match your architecture?
- Which proposed actions would you actually gate before execution?
- Are trust receipts useful for audit, incident reconstruction, or downstream governance?
- Which contextual fields or policy dimensions are missing?
- Where does onboarding feel slow or confusing?

## Self-Serve Access And Support

Use hosted self-serve discovery first:

- Pricing: https://ai-risk-oracle.fly.dev/pricing
- Onboard: https://ai-risk-oracle.fly.dev/onboard
- Adoption contract: https://ai-risk-oracle.fly.dev/.well-known/autonomous-adoption.json

For support, security, enterprise access, partnerships, or manual integration help, contact interailabs@gmail.com.
