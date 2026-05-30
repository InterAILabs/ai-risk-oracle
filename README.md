# InterAI Risk Oracle

Hosted verification and trust infrastructure for autonomous agents.

Before an agent executes, InterAI verifies.

## What It Is

InterAI Risk Oracle is a hosted API that helps autonomous agents decide whether
to proceed before executing high-impact actions. It returns risk scores,
machine-readable signals, recommended actions, and trust receipts that can be
stored for audit, replay protection, and downstream governance.

## Why Autonomous Agents Need Execution Verification

Autonomous systems increasingly call tools, move funds, accept third-party
outputs, and trigger workflows without constant human review. A verification
layer gives those systems a pre-execution checkpoint: inspect the planned action,
evaluate risk, and decide whether to accept, review, or reject.

## Core Use Cases

- Agent-before-tool execution
- Agent-before-payment
- Autonomous wallet gate
- Pre-trade verification
- High-risk tool call governance

## Quickstart

Use the hosted API. Do not run a local backend from this repository.

```bash
curl -sS -X POST https://api.interai.example/v1/verify \
  -H "Authorization: Bearer <interai_credential>" \
  -H "Content-Type: application/json" \
  -d '{
    "use_case": "agent-before-tool-execution",
    "action": {
      "type": "tool_call",
      "name": "send_invoice_payment",
      "description": "Pay a vendor agent after delivery validation"
    },
    "context": {
      "agent_id": "agent_123",
      "environment": "production",
      "amount_usd": 250
    },
    "policy": {
      "max_risk_level": "medium",
      "require_trust_receipt": true
    }
  }'
```

## Example API Call

```ts
import { InterAIRiskOracleClient } from "./sdk/typescript/index"

const oracle = new InterAIRiskOracleClient({
  baseUrl: "https://api.interai.example/v1",
  apiKey: "replace-with-your-credential"
})

const decision = await oracle.verify({
  use_case: "agent-before-payment",
  action: {
    type: "payment",
    description: "Release payment to a vendor agent",
    amount_usd: 125
  },
  context: {
    agent_id: "agent_123",
    counterparty_id: "vendor_agent_456"
  },
  policy: {
    max_risk_level: "medium",
    require_trust_receipt: true
  }
})

if (decision.recommended_action === "accept") {
  // Continue with the downstream action.
}
```

## Example Response

```json
{
  "decision_id": "dec_01JZPUBLICEXAMPLE",
  "score": 0.82,
  "risk_level": "low",
  "signals": [
    {
      "name": "counterparty_reputation",
      "value": "positive",
      "weight": 0.32
    },
    {
      "name": "action_amount",
      "value": "within_policy",
      "weight": 0.18
    }
  ],
  "recommended_action": "accept",
  "trust_receipt_id": "tr_01JZPUBLICEXAMPLE"
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

- Docs: https://interai.example/docs
- Contact: beta@interai.example
- Security: security@interai.example
