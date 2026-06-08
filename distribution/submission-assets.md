# Submission Assets

Use this file as the source copy for external directory submissions.

## One-Line Description

Before an agent executes, InterAI verifies.

## Short Description

InterAI Risk Oracle is an Autonomous Execution Gateway for pre-execution
verification of autonomous agents.

## Long Description

InterAI Risk Oracle helps autonomous agents, orchestrators, wallet agents, and
policy layers verify proposed actions before execution. Agents call InterAI
before tool use, payment release, wallet signing, database updates, workflow
approval, or other consequential actions.

InterAI returns a risk score, machine-readable signals, `recommended_action`,
`policy_result`, and trust receipt metadata. The calling agent can then execute,
route for review, or abort under the current policy, and store the receipt for
audit.

## Tags

- autonomous agents
- AI agents
- agent safety
- execution gateway
- pre-execution verification
- policy enforcement
- trust receipts
- x402
- Base USDC
- OpenAPI
- MCP
- A2A
- developer API

## Category

Autonomous Execution Gateway

## URLs

- Homepage: https://ai-risk-oracle.fly.dev
- GitHub repo: https://github.com/InterAILabs/ai-risk-oracle
- Release URL: https://github.com/InterAILabs/ai-risk-oracle/releases/tag/v0.1.0-beta
- Hosted service URL: https://ai-risk-oracle.fly.dev
- Pricing URL: https://ai-risk-oracle.fly.dev/pricing
- Onboard URL: https://ai-risk-oracle.fly.dev/onboard
- OpenAPI URL: https://ai-risk-oracle.fly.dev/.well-known/openapi.json
- AI service descriptor URL: https://ai-risk-oracle.fly.dev/.well-known/ai-service.json
- Agent card URL: https://ai-risk-oracle.fly.dev/.well-known/agent.json
- Discovery bundle URL: https://ai-risk-oracle.fly.dev/.well-known/discovery-bundle.json
- Autonomous adoption URL: https://ai-risk-oracle.fly.dev/.well-known/autonomous-adoption.json

## x402/Base USDC Support

InterAI exposes x402/Base USDC support through hosted pricing metadata.

Use https://ai-risk-oracle.fly.dev/pricing as the source of truth for current
payment requirements, costs, chain metadata, prepaid API key support, and trial
availability.

Do not hard-code payment values in directory submissions unless the directory
requires fixed copy. Prefer linking to `/pricing`.

## Decision Contract

- `request_contract`: `autonomous_execution`
- `recommended_action`: `allow`, `review_required`, or `block`
- `policy_result`: `allow`, `review_required`, or `block`
- `risk_level`: `low`, `medium`, or `high`
- `score`: risk score from 0 to 1; higher means more risk
- `signals`: object
- `policy_violations`: array
- `trust_receipt_id`: receipt ID when a receipt is issued

`review_required` means the current agent should not execute autonomously under
the current policy. The reviewer may be a supervisor agent, policy system,
wallet rule, governance queue, or human operator.

## Beta Scope

InterAI Risk Oracle is in controlled technical beta.

It is appropriate for:

- technical testers;
- agent builders;
- autonomous workflow platforms;
- wallet/payment agent teams;
- policy and governance integrations;
- API and agent infrastructure reviewers.

It should not be described as a broad high-volume production service yet. See
`docs/distribution-checklist.md` for readiness notes.

## Support Contact

Email: interailabs@gmail.com

Use email for support, security, enterprise access, partnerships, or manual
integration help. Email is not required for the default self-serve path.
