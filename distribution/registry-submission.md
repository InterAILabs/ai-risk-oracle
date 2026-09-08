# Registry Submission Draft

## Service

InterAI Risk Oracle

## Category

Pre-execution decision layer for consequential agent actions

## Short Description

Independent pre-execution decision layer for consequential agent actions. Before an agent executes, InterAI verifies.

## Long Description

InterAI Risk Oracle is a hosted independent pre-execution decision layer for consequential
agent actions. Agents call InterAI before a tool call, payment, workflow approval, database
mutation, trade, external message, signature, or other consequential action. InterAI applies
its policy boundary and returns a machine-readable risk score, policy result, recommended
action, and trust receipt metadata. InterAI does not execute the external action.

## Primary Adoption Path

```text
discover -> pricing -> onboard/API key/trial or x402 -> verify -> decision -> store receipt
```

Email is available for support, security, enterprise access, partnerships, and manual
integration help. It is not required for the default self-serve path.

## Decision Contract

- `request_contract`: `autonomous_execution`
- `recommended_action`: `allow`, `review_required`, or `block`
- `policy_result`: `allow`, `review_required`, or `block`
- `risk_level`: `low`, `medium`, or `high`
- `score`: risk score from 0 to 1; higher means more risk
- `signals`: object
- `trust_receipt_id`: durable decision evidence

`review_required` means the current agent should not execute autonomously under the
current policy. Route to a supervisor, policy system, wallet rule, governance queue, or
human operator.

## External Evidence Boundary

`external-evidence/v0 rev6` Stage 2 is limited to:

```text
parse -> verify -> bind -> record
```

Provider evidence remains non-authoritative at this stage:

```text
authority: none
contribution: ignored
affects_decision: false
```

Stage 2 does not change signals, score, `semantic_judge`, policy, or the final decision.

## SDKs

- npm: `interai-risk-oracle@0.1.3-beta`
- PyPI: `interai-risk-oracle==0.1.3b0`

The TypeScript package is published on npm. The Python package is published on PyPI through
GitHub Actions Trusted Publishing with digital attestations.

## Public URLs

- Hosted service: https://ai-risk-oracle.fly.dev
- Public repository: https://github.com/InterAILabs/ai-risk-oracle
- Action Boundary Lab: https://ai-risk-oracle.fly.dev/lab
- Controlled demo: https://ai-risk-oracle.fly.dev/demo
- OpenAPI: https://ai-risk-oracle.fly.dev/.well-known/openapi.json
- Agent card: https://ai-risk-oracle.fly.dev/.well-known/agent.json
- AI service descriptor: https://ai-risk-oracle.fly.dev/.well-known/ai-service.json
- Discovery bundle: https://ai-risk-oracle.fly.dev/.well-known/discovery-bundle.json
- Autonomous adoption descriptor: https://ai-risk-oracle.fly.dev/.well-known/autonomous-adoption.json
- Pricing: https://ai-risk-oracle.fly.dev/pricing
- Onboard: https://ai-risk-oracle.fly.dev/onboard

## Submission Notes

The hosted OpenAPI and MCP runtime identity/documentation gates were cleared in production at
core commit `bdda078784e02e2bc544aaac9b07ac2cc23e8d2b`, with successful CI and Fly production
smoke.

This file is current submission copy for registry operators and ecosystem partners. Verify
every target registry or directory immediately before submission. Do not announce placement,
approval, third-party health status, ownership, or analytics state until the external operator
or registry confirms it.
