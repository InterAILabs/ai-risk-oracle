# A2A Readiness

InterAI Risk Oracle exposes an A2A agent card for agent-to-agent discovery and
pre-execution verification.

## Discovery

- Agent card: `GET https://ai-risk-oracle.fly.dev/.well-known/agent.json`
- A2A endpoint: `POST https://ai-risk-oracle.fly.dev/a2a`
- API contract: `GET https://ai-risk-oracle.fly.dev/.well-known/openapi.json`

## Decision Mapping

- `allow`: the calling agent may continue under the current policy.
- `review_required`: the current agent should not execute autonomously under the
  current policy.
- `block`: the calling agent should abort the action and log the decision.

## Suggested Agent Placement

Place InterAI before:

- tool execution
- payment release
- wallet signing
- database update
- workflow approval
- outbound message send

## Current Status

Ready for controlled integration tests with agent builders. Use the hosted
metadata as the source of truth during onboarding.

