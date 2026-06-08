# GitHub Release Draft: v0.1.0-beta

## Title

InterAI Risk Oracle v0.1.0-beta

## Release Type

Pre-release / controlled technical beta.

## Notes

InterAI Risk Oracle is an Autonomous Execution Gateway for pre-execution
verification of autonomous agents.

Before an agent executes, InterAI verifies.

This public beta package is for controlled technical testers, agent builders,
wallet/payment agents, autonomous workflow platforms, and integration partners.
It is not a broad high-volume self-serve production declaration.

## Highlights

- Autonomous Execution Gateway public beta.
- Agent-native and human self-serve adoption path:
  `/pricing`, `/onboard`, `/verify`, decision handling, and receipt storage.
- `.well-known` discovery metadata.
- Autonomous adoption contract.
- OpenAPI, A2A, and MCP metadata.
- x402/Base USDC support.
- Prepaid API key and trial metadata.
- Trust receipts.
- Public/private repository boundary.

## Decision Contract

- `recommended_action`: `allow`, `review_required`, or `block`
- `policy_result`: `allow`, `review_required`, or `block`
- `risk_level`: `low`, `medium`, or `high`
- `score`: risk score from 0 to 1; higher means more risk
- `signals`: object

`review_required` means the current agent should not execute autonomously under
the current policy. The reviewer may be a supervisor agent, policy system,
wallet rule, governance queue, or human operator.

## Public Links

- Hosted service: https://ai-risk-oracle.fly.dev
- Pricing: https://ai-risk-oracle.fly.dev/pricing
- Onboard: https://ai-risk-oracle.fly.dev/onboard
- OpenAPI: https://ai-risk-oracle.fly.dev/.well-known/openapi.json
- AI service descriptor: https://ai-risk-oracle.fly.dev/.well-known/ai-service.json
- Discovery bundle: https://ai-risk-oracle.fly.dev/.well-known/discovery-bundle.json
- Agent card: https://ai-risk-oracle.fly.dev/.well-known/agent.json
- Autonomous adoption: https://ai-risk-oracle.fly.dev/.well-known/autonomous-adoption.json

## Manual Release Checklist

- Create tag/release `v0.1.0-beta`.
- Mark the release as a pre-release.
- Keep the release as draft until final operator review.
- Use these notes as the release body.
- Confirm `docs/distribution-checklist.md` remains linked from the changelog.
- Do not describe this beta as broad high-volume production-ready.

