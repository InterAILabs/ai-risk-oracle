# InterAI Risk Oracle

Hosted verification and trust infrastructure for autonomous agents.

Before an agent executes, InterAI verifies.

## What It Is

InterAI Risk Oracle is a hosted API that helps autonomous agents decide whether
to proceed before executing high-impact actions. It returns risk scores,
machine-readable signals, recommended actions, and trust receipts that can be
stored for audit, replay protection, and downstream governance.

## Why Autonomous Agents Need Execution Verification

Autonomous systems increasingly call tools, move funds, consume third-party
outputs, and trigger workflows without constant human review. A verification
layer gives those systems a pre-execution checkpoint: inspect the planned action,
evaluate risk, and decide whether to allow, require review, or block execution.

## Core Use Cases

- Agent-before-tool execution
- Agent-before-payment
- Autonomous wallet gate
- Pre-trade verification
- High-risk tool call governance

## Quickstart

Use the hosted API. Do not run a local backend from this repository.

```bash
curl -sS -X POST https://ai-risk-oracle.fly.dev/verify \
  -H "Authorization: Bearer <interai_credential>" \
  -H "Content-Type: application/json" \
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

const decision = await oracle.verify({
  use_case: "agent-before-payment",
  action: {
    type: "payment",
    name: "release_vendor_payment",
    description: "Release payment to a vendor agent",
    amount_usd: 125,
    currency: "USD",
    irreversible: false,
    external_side_effect: true
  },
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

if (decision.recommended_action === "allow") {
  // Continue with the downstream action.
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

Trust receipts are durable records of a verification decision. They are designed
for agent-to-agent handoff, audit trails, retry safety, and governance systems
that need to prove a verification happened before execution.

See [docs/trust-receipts.md](docs/trust-receipts.md).

## Discovery

Agent-readable discovery metadata is available in [discovery/](discovery/).
These files describe public capabilities, authentication, schemas, and integration
surfaces without exposing service internals.

## SDKs

- [TypeScript SDK](sdk/typescript/README.md)
- [Python SDK](python/README.md)

## Examples

- [Agent before tool execution](examples/agent-before-tool-execution/README.md)
- [Agent before payment](examples/agent-before-payment/README.md)
- [Autonomous wallet gate](examples/autonomous-wallet-gate/README.md)
- [Pre-trade verification](examples/pre-trade-verification/README.md)

## Public Repository Scope

This repository contains public API documentation, SDKs, schemas, examples, and
discovery metadata for the hosted InterAI Risk Oracle service. The production
verification engine, billing infrastructure, trust logic, scoring system, and
hosted service internals are proprietary and not open source.

## Beta Access / Contact

InterAI Risk Oracle is currently available through hosted beta access.

- Docs: https://github.com/InterAILabs/ai-risk-oracle
- Contact: interailabs@gmail.com
- Security: interailabs@gmail.com
