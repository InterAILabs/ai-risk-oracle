# InterAI Risk Oracle

Centralized policy gate and signed audit receipts for consequential agent actions.

Before an agent executes, InterAI verifies.

```text
Agent proposes action
  -> InterAI verifies
  -> allow / review_required / block
  -> execute / route / abort
  -> store receipt
```

## What It Is

InterAI Risk Oracle sits between an autonomous agent and the action it wants to execute:
a tool call, payment, wallet signature, database update, workflow approval, trade, or
outbound message.

The agent sends the proposed action to InterAI before execution. InterAI returns a risk
score, machine-readable signals, `recommended_action`, `policy_result`, and trust
receipt metadata. The agent then executes, routes for review, or aborts based on the
decision, and stores the receipt for audit.

Default self-serve path:

```text
pricing -> onboard/API key/trial or x402 -> verify -> decision -> receipt
```

Run the live read-only demo first:

```text
https://ai-risk-oracle.fly.dev/demo
```

## Use InterAI Before Tool Execution

Wire InterAI into your agent before the agent executes a tool or action:

- Demo: https://ai-risk-oracle.fly.dev/demo
- TypeScript middleware example: [examples/agent-middleware/typescript](examples/agent-middleware/typescript)
- Python middleware example: [examples/agent-middleware/python](examples/agent-middleware/python)
- Integration patterns: [docs/integration-patterns.md](docs/integration-patterns.md)

```text
decision = interai.verify(action)
if decision.allow:
  execute(action)
elif decision.review_required:
  route_to_review(action)
else:
  block(action)
store(decision.trust_receipt_id)
```

## Why Autonomous Agents Need Execution Verification

Autonomous systems increasingly call tools, move funds, consume third-party outputs, and
trigger workflows without constant human review. A verification layer gives those
systems a pre-execution checkpoint: inspect the planned action, evaluate risk, and
decide whether to allow, require review, or block execution.

## Core Use Cases

- Agent-before-tool execution
- Agent-before-payment
- Autonomous wallet gate
- Pre-trade verification
- High-risk tool call governance

## Who Is This For?

- agent builders
- autonomous workflow platforms
- wallet/payment agents
- tool-using AI systems
- governance and audit layers

## What This Repository Is / Is Not

This repository is for public integration materials: SDKs, schemas, examples, OpenAPI,
A2A/MCP discovery metadata, and hosted API docs. The production verification engine is
hosted and proprietary.

Use the SDKs, schemas, examples, and discovery metadata to integrate with the hosted
API. Do not expect to run the production verification engine from this repo.

## Quickstart

Use the hosted API. Do not run a local backend from this repository. Start with
the guided demo at https://ai-risk-oracle.fly.dev/demo. One click creates a
short-lived credential in memory, evaluates a fixed safe action, and opens its
public receipt. Then use OpenAPI and the SDK source to integrate the hosted API.

```bash
curl -sS -X POST https://ai-risk-oracle.fly.dev/verify \
  -H "Authorization: Bearer <interai_credential>" \
  -H "Content-Type: application/json" \
  -H "X-Idempotency-Key: quickstart-operation-1" \
  -d '{
    "use_case": "agent-before-tool-execution",
    "action": {
      "type": "tool_call",
      "name": "send_invoice_payment",
      "description": "Pay a vendor agent after delivery validation",
      "amount_usd": 250,
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

## Example API Call

```ts
import { InterAIRiskOracleClient } from "./sdk/typescript/index"

const oracle = new InterAIRiskOracleClient({
  baseUrl: "https://ai-risk-oracle.fly.dev",
  apiKey: "replace-with-your-credential"
})

const action = {
  type: "payment",
  name: "release_vendor_payment",
  description: "Release payment to a vendor agent",
  amount_usd: 125,
  currency: "USD",
  irreversible: false,
  external_side_effect: true
}

const decision = await oracle.verify({
  use_case: "agent-before-payment",
  action,
  context: {
    agent_id: "agent_123",
    environment: "production",
    counterparty_id: "vendor_agent_456",
    user_confirmation: false
  },
  policy: {
    max_risk_level: "medium",
    require_trust_receipt: true,
    amount_usd_limit: 500,
    blocked_action_types: ["irreversible_transfer"],
    require_human_review_above: 0.75
  }
})

switch (decision.recommended_action) {
  case "allow":
    await execute(action)
    break

  case "review_required":
    await routeToSupervisorOrPolicyLayer(action, decision)
    break

  case "block":
    await abortAction(action, decision)
    break
}
```

## Example Response

`score` is a risk score from 0 to 1. Higher values mean higher execution risk.

```json
{
  "decision_id": "tr_01JZPUBLICEXAMPLE",
  "request_contract": "autonomous_execution",
  "score": 0.42,
  "risk_level": "medium",
  "signals": {
    "has_external_side_effect": true,
    "is_irreversible": false,
    "involves_money": true,
    "amount_usd": 125,
    "requires_user_confirmation": true,
    "has_counterparty": true,
    "environment": "production",
    "action_type": "payment",
    "autonomous_execution_detected": true
  },
  "recommended_action": "review_required",
  "policy_result": "review_required",
  "policy_violations": [],
  "trust_receipt_id": "tr_01JZPUBLICEXAMPLE",
  "trust_receipt": {}
}
```

## Trust Receipts

Trust receipts are durable records of a verification decision. They are designed for
agent-to-agent handoff, audit trails, retry safety, and governance systems that need to
prove a verification happened before execution.

See [docs/trust-receipts.md](docs/trust-receipts.md).

## Agent-Native and Self-Serve Adoption

InterAI is not only for human developers. Autonomous agents, orchestrators, wallet
agents, tool routers, and policy layers can discover InterAI from `.well-known` metadata
and decide when to use it before execution.

Default agent path:

```text
discover -> onboard or x402 -> verify -> act on decision -> store receipt
```

Default human path:

```text
GitHub/landing -> pricing -> onboard -> API key/topup/x402 -> verify -> store receipt
```

Email is available for support, security, enterprise access, partnerships, and manual
integration help. It is not required as the core self-serve path.

- Public adoption contract: [discovery/autonomous-adoption.json](discovery/autonomous-adoption.json)
- Hosted adoption contract: https://ai-risk-oracle.fly.dev/.well-known/autonomous-adoption.json
- Demo: https://ai-risk-oracle.fly.dev/demo
- Pricing: https://ai-risk-oracle.fly.dev/pricing
- Onboard: https://ai-risk-oracle.fly.dev/onboard

## Discovery

Agent-readable discovery metadata is available in [discovery/](discovery/). These files
describe public capabilities, authentication, schemas, and integration surfaces without
exposing service internals.

## SDKs

- [TypeScript SDK](sdk/typescript/README.md) — buildable npm package source
- [Python SDK](python/README.md) — buildable Python package source

Both packages are prepared for publication and generate idempotency keys by
default. Confirm the corresponding registry release before advertising an
install command as generally available.

Bearer-billed HTTP verification requires an idempotency key; the SDKs generate
one automatically. For retrying the same business operation, supply the same
stable key. Autonomous actions that omit `external_side_effect` or
`irreversible` expose those signals as `null` and receive at least
`review_required` rather than being interpreted as safe.

## Examples

- [3 decisions in 90 seconds](docs/demo.md)
- [Distribution pack](docs/distribution-pack.md)
- [Tester readiness pack](docs/tester-readiness.md)
- [Agent before tool execution](examples/agent-before-tool-execution/README.md)
- [Agent before payment](examples/agent-before-payment/README.md)
- [Agent middleware TypeScript](examples/agent-middleware/typescript/README.md)
- [Agent middleware Python](examples/agent-middleware/python/README.md)
- [Autonomous wallet gate](examples/autonomous-wallet-gate/README.md)
- [Pre-trade verification](examples/pre-trade-verification/README.md)
- [Integration patterns](docs/integration-patterns.md)
- [Adoption recovery and measurement](docs/adoption-recovery.md)

## Public Repository Scope

This repository contains public API documentation, SDKs, schemas, examples, and
discovery metadata for the hosted InterAI Risk Oracle service. The production
verification engine, billing infrastructure, trust logic, scoring system, and hosted
service internals are proprietary and not open source.

## Self-Serve Access / Contact

InterAI Risk Oracle is available through hosted self-serve metadata and API endpoints.
Agents and integrators can discover pricing, onboarding, and verification endpoints
directly from the hosted API.

- Docs: https://github.com/InterAILabs/ai-risk-oracle
- Support / enterprise / partnerships: interailabs@gmail.com
- Security: interailabs@gmail.com
