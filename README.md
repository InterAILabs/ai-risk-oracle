# InterAI Risk Oracle

**Independent pre-execution decision layer for consequential agent actions.**

> Before an agent executes, InterAI verifies.

InterAI sits between an autonomous agent and a consequential action. The agent proposes what it wants to do; InterAI evaluates the action in context, applies request-scoped policy constraints, and returns a machine-readable authority decision:

```text
proposed action
      |
      v
   InterAI
      |
      +--> ALLOW
      +--> REVIEW_REQUIRED
      +--> BLOCK
      |
      v
 signed trust receipt
```

The important boundary is not merely **can this principal technically perform the action?** It is:

**Should this specific action execute now, in this context, under this policy?**

That makes InterAI complementary to authentication, permissions, spend limits, workflow rules, and domain-specific controls rather than a replacement for them.

## Where InterAI Fits

```text
Identity / authentication
  "Who is this?"
        |
Permissions / deterministic limits
  "Can this principal do this class of operation?"
        |
InterAI
  "Should this exact proposed action execute in this context?"
        |
Execution / escalation / abort
```

Use InterAI when an agent is about to do something with real consequences: execute a tool, move funds, update production state, approve a workflow, sign a wallet action, send an external message, or trigger another irreversible or costly operation.

## Decision Contract

For autonomous execution requests, InterAI returns:

- `recommended_action`: `allow`, `review_required`, or `block`
- `policy_result`: the authority result under the supplied policy constraints
- `score`: execution-risk score from `0` to `1`
- `risk_level`: `low`, `medium`, or `high`
- `signals`: machine-readable action and risk signals
- `policy_violations`: explicit policy findings
- `trust_receipt_id`: durable decision evidence

`review_required` means the current agent should not execute autonomously under the current policy. Review can be handled by a supervisor agent, policy system, governance queue, wallet rule, or human operator.

### Policy authority boundary

The `policy` object in the current request contract is supplied by the caller. It can constrain that request, but by itself it does **not** prove that a compromised caller was unable to remove or weaken those constraints.

A true tenant/host enforcement boundary requires policy to be anchored outside the action request and controlled by an authority the gated actor cannot modify. InterAI should not be described as providing that stronger guarantee from caller-supplied policy alone.

## Example

```json
{
  "use_case": "agent-before-payment",
  "action": {
    "type": "payment",
    "name": "release_vendor_payment",
    "description": "Release payment to a vendor agent after delivery validation",
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
    "require_human_review_above": 0.75
  }
}
```

Possible result:

```json
{
  "request_contract": "autonomous_execution",
  "recommended_action": "review_required",
  "policy_result": "review_required",
  "risk_level": "medium",
  "score": 0.42,
  "trust_receipt_id": "tr_01JZPUBLICEXAMPLE"
}
```

The calling system then decides how to honor that authority decision:

```text
ALLOW             -> execute
REVIEW_REQUIRED   -> route / pause / escalate
BLOCK             -> abort
```

## Try The Hosted Beta

Live demo:

```text
https://ai-risk-oracle.fly.dev/demo
```

Hosted verification:

```bash
curl -sS -X POST https://ai-risk-oracle.fly.dev/verify \
  -H "Authorization: Bearer <interai_credential>" \
  -H "Content-Type: application/json" \
  -H "X-Idempotency-Key: vendor-payment-001" \
  -d '{
    "use_case": "agent-before-payment",
    "action": {
      "type": "payment",
      "name": "release_vendor_payment",
      "amount_usd": 125,
      "currency": "USD",
      "irreversible": false,
      "external_side_effect": true
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
  }'
```

## Trust Receipts

Every consequential decision can produce a durable trust receipt. Receipts are designed to make pre-execution decisions inspectable and transportable across retries, handoffs, governance systems, and later audits.

Current receipt signatures use HMAC-SHA256 and are **service-verifiable** by InterAI. That provides authenticated service-side integrity; it is not the same guarantee as an independently verifiable public-key signature that a third party can validate offline without InterAI.

A receipt proves what the signed receipt payload authenticates at that point in time. It does **not** prove that an underlying claim is universally true and does not replace domain-specific controls or human review where those are required.

See [docs/trust-receipts.md](docs/trust-receipts.md).

## Integration Surfaces

InterAI is available as a hosted service and can be discovered or called through several public interfaces:

- HTTPS API and OpenAPI 3.1
- TypeScript SDK
- Python SDK
- MCP remote
- A2A endpoint
- `.well-known` discovery metadata
- x402 / Base USDC payment path
- prepaid API-key path

Useful starting points:

- [Integration patterns](docs/integration-patterns.md)
- [Tester readiness](docs/tester-readiness.md)
- [TypeScript middleware example](examples/agent-middleware/typescript)
- [Python middleware example](examples/agent-middleware/python)
- [Agent before payment](examples/agent-before-payment)
- [Agent before tool execution](examples/agent-before-tool-execution)

## Current Product Scope

InterAI is a **controlled technical beta**.

Ready now:

- autonomous action verification
- explicit `allow / review_required / block` decisions
- request-scoped policy evaluation for action type, amount, risk, irreversible actions, and review thresholds
- signed, service-verifiable trust receipts and public receipt lookup
- idempotent paid verification
- hosted OpenAPI, MCP, A2A, and machine-readable discovery

Not claimed yet:

- tenant/host policy authority that a compromised caller cannot weaken merely through the request body
- independently verifiable public-key receipt signatures
- broad high-volume production readiness
- enterprise procurement readiness
- universal factual truth guarantees
- replacement of medical, legal, financial, safety-critical, or other domain-specific review

See [docs/professional-readiness.md](docs/professional-readiness.md) for the current readiness boundary.

## Legacy Compatibility

InterAI still supports the earlier prompt/response verification contract for compatibility. The primary product direction is the `autonomous_execution` contract and pre-execution decision boundary.

## Repository Boundary

This public repository contains integration materials: SDKs, schemas, examples, OpenAPI/discovery metadata, and documentation for the hosted service.

The production verification engine, billing infrastructure, trust logic, scoring internals, and hosted service implementation remain proprietary.

## Engineering

InterAI Risk Oracle is built by **Alejandro Bolognese / InterAI Labs** as part of ongoing work on agent infrastructure, execution systems, and autonomous workflows.

The project deliberately keeps claims narrow: the goal is not to brand every agent interaction as a security problem, but to create a clear authority boundary before consequential execution.

## Links

- Hosted beta: https://ai-risk-oracle.fly.dev
- Demo: https://ai-risk-oracle.fly.dev/demo
- Pricing: https://ai-risk-oracle.fly.dev/pricing
- Onboard: https://ai-risk-oracle.fly.dev/onboard
- OpenAPI: https://ai-risk-oracle.fly.dev/.well-known/openapi.json
- MCP: https://ai-risk-oracle.fly.dev/mcp
- Support / security / partnerships: interailabs@gmail.com