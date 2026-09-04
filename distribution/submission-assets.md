# Submission Assets

Use this file as the source copy for external directory submissions.

## One-Line Description

Before an agent executes, InterAI verifies.

## Short Description

InterAI Risk Oracle is an independent pre-execution decision layer for consequential AI-agent actions.

## Long Description

InterAI Risk Oracle sits between an autonomous agent and a consequential action such as a tool call, payment, production write, workflow approval, wallet signature, or outbound message.

Identity and permission systems answer whether a principal can technically perform an operation. InterAI answers a different question: **should this exact proposed action execute now, in this context, under this policy?**

Agents call InterAI before execution. InterAI returns machine-readable risk and policy findings, `recommended_action`, `policy_result`, and trust-receipt metadata. The calling system can then execute, route for review, or abort.

InterAI is complementary to authentication, permissions, spend controls, governance systems, and domain-specific review rather than a replacement for them.

## Tags

- autonomous agents
- AI agents
- pre-execution decision layer
- action authorization
- contextual authority
- agent governance
- policy enforcement
- trust receipts
- x402
- Base USDC
- OpenAPI
- MCP
- A2A
- developer API

## Category

Pre-execution decision infrastructure

For directories that require an existing ecosystem category, use the nearest accurate category such as agent infrastructure, governance, developer API, or autonomous-agent tooling. Avoid broad claims that InterAI is a complete AI-security platform.

## URLs

- Homepage: https://ai-risk-oracle.fly.dev
- GitHub repo: https://github.com/InterAILabs/ai-risk-oracle
- Current public beta release: https://github.com/InterAILabs/ai-risk-oracle/releases/tag/v0.1.3-beta
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

Use https://ai-risk-oracle.fly.dev/pricing as the source of truth for current payment requirements, costs, chain metadata, prepaid API-key support, and trial availability.

Do not make billing the lead message unless the destination specifically concerns x402 or machine payments. The primary product value is the pre-execution decision boundary.

## Decision Contract

- `request_contract`: `autonomous_execution`
- `recommended_action`: `allow`, `review_required`, or `block`
- `policy_result`: `allow`, `review_required`, or `block`
- `risk_level`: `low`, `medium`, or `high`
- `score`: risk score from 0 to 1; higher means more risk
- `signals`: object
- `policy_violations`: array
- `trust_receipt_id`: receipt ID when a receipt is issued

`review_required` means the current agent should not execute autonomously under the current policy. The reviewer may be a supervisor agent, policy system, wallet rule, governance queue, or human operator.

## Positioning Guardrails

Use these distinctions consistently:

- Authentication: who is the principal?
- Permissions / deterministic controls: can this principal perform this class of operation?
- InterAI: should this exact proposed action execute in this context?

Do not describe InterAI as replacing IAM, wallet permissions, spend limits, compliance systems, or mandatory human review.

Do not describe signed receipts as proof that underlying claims are universally true. They are durable evidence of what InterAI evaluated and decided.

Do not claim broad enterprise or high-volume readiness.

## Beta Scope

InterAI Risk Oracle is in controlled technical beta.

It is appropriate for:

- technical testers;
- agent builders;
- autonomous workflow platforms;
- wallet/payment agent teams;
- policy and governance integrations;
- regulated workflow experiments;
- API and agent infrastructure reviewers.

It should not be described as a broad high-volume production service yet. See `docs/distribution-checklist.md` for readiness notes.

## Engineering Attribution

InterAI Risk Oracle is built by Alejandro Bolognese / InterAI Labs.

Use this attribution where individual technical authorship is useful, while keeping InterAI Labs as the product identity.

## Support Contact

Email: interailabs@gmail.com

Use email for support, security, enterprise access, partnerships, or manual integration help. Email is not required for the default self-serve path.
