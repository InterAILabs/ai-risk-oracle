# Registry Submission Draft

## Service

InterAI Risk Oracle

## Category

Autonomous Execution Gateway

## Short Description

Before an agent executes, InterAI verifies.

## Long Description

InterAI Risk Oracle is a hosted Autonomous Execution Gateway for pre-execution
verification of autonomous agents. Agents call InterAI before a tool call,
payment, workflow approval, database mutation, trade, or other action. InterAI
returns a machine-readable risk score, policy result, recommended action, and
trust receipt metadata.

## Primary Adoption Path

```text
discover -> pricing -> onboard/API key/trial or x402 -> verify -> decision -> store receipt
```

Email is available for support, security, enterprise access, partnerships, and
manual integration help. It is not required for the default self-serve path.

## Decision Contract

- `request_contract`: `autonomous_execution`
- `recommended_action`: `allow`, `review_required`, or `block`
- `policy_result`: `allow`, `review_required`, or `block`
- `risk_level`: `low`, `medium`, or `high`
- `score`: risk score from 0 to 1; higher means more risk
- `signals`: object

`review_required` means the current agent should not execute autonomously under
the current policy. Route to a supervisor, policy system, wallet rule,
governance queue, or human operator.

## Public URLs

- Hosted service: https://ai-risk-oracle.fly.dev
- Public repository: https://github.com/InterAILabs/ai-risk-oracle
- OpenAPI: https://ai-risk-oracle.fly.dev/.well-known/openapi.json
- Agent card: https://ai-risk-oracle.fly.dev/.well-known/agent.json
- AI service descriptor: https://ai-risk-oracle.fly.dev/.well-known/ai-service.json
- Discovery bundle: https://ai-risk-oracle.fly.dev/.well-known/discovery-bundle.json
- Autonomous adoption descriptor: https://ai-risk-oracle.fly.dev/.well-known/autonomous-adoption.json
- Pricing: https://ai-risk-oracle.fly.dev/pricing
- Onboard: https://ai-risk-oracle.fly.dev/onboard

## Submission Notes

This file is a draft for registry operators and ecosystem partners. Do not
announce registry placement until the external operator confirms the placement.

