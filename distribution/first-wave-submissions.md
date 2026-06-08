# First-Wave Submission Copy

Use these blocks as starting copy for manual submissions. Adapt to each
directory's field limits and rules.

Do not claim InterAI is listed, certified, partnered, audited, or approved by a
directory unless that is already true.

## OpenAPI/API Directory

Title:

```text
InterAI Risk Oracle
```

One-line description:

```text
Before an agent executes, InterAI verifies.
```

Short description:

```text
InterAI Risk Oracle is an Autonomous Execution Gateway for pre-execution verification of autonomous agents.
```

Long description:

```text
InterAI Risk Oracle helps autonomous agents and orchestrators verify proposed actions before tool use, payment release, wallet signing, database updates, workflow approval, or other consequential execution. The API returns a risk score, machine-readable signals, recommended_action, policy_result, and trust receipt metadata so the calling agent can allow, route for review, or block under the current policy.
```

Tags:

```text
autonomous agents, AI agents, execution gateway, pre-execution verification, policy enforcement, trust receipts, OpenAPI, x402, Base USDC
```

Category:

```text
AI infrastructure / Autonomous Execution Gateway
```

Links:

- Homepage: https://ai-risk-oracle.fly.dev
- OpenAPI: https://ai-risk-oracle.fly.dev/.well-known/openapi.json
- Pricing: https://ai-risk-oracle.fly.dev/pricing
- Onboard: https://ai-risk-oracle.fly.dev/onboard
- GitHub: https://github.com/InterAILabs/ai-risk-oracle

What not to claim:

- Do not claim high-volume production scale.
- Do not claim third-party certification.
- Do not claim listing approval until accepted.

## x402 Ecosystem/Directory

Title:

```text
InterAI Risk Oracle
```

One-line description:

```text
An x402-compatible Autonomous Execution Gateway for pre-execution verification.
```

Short description:

```text
InterAI lets agents pay for pre-execution verification through x402/Base USDC or use prepaid API keys with trial support.
```

Long description:

```text
InterAI Risk Oracle exposes pricing and payment metadata for paid verification flows. Agents can discover pricing, onboard with a prepaid API key and trial where available, or use x402-compatible paid requests before executing consequential actions. Verification responses include recommended_action, policy_result, score, risk_level, signals, and trust receipt metadata.
```

Links:

- Pricing: https://ai-risk-oracle.fly.dev/pricing
- Verify endpoint: https://ai-risk-oracle.fly.dev/verify
- AI service descriptor: https://ai-risk-oracle.fly.dev/.well-known/ai-service.json
- Autonomous adoption descriptor: https://ai-risk-oracle.fly.dev/.well-known/autonomous-adoption.json

What not to claim:

- Do not hard-code pricing if the directory can link to `/pricing`.
- Do not perform real payments just to draft a listing.
- Do not claim x402 ecosystem acceptance before review.

## Developer API Directory

Title:

```text
InterAI Risk Oracle API
```

One-line description:

```text
Pre-execution verification API for autonomous agents.
```

Short description:

```text
InterAI provides an API for agents to verify proposed actions before execution and store trust receipts for audit.
```

Long description:

```text
The InterAI Risk Oracle API is built for autonomous agents, wallet agents, workflow engines, and policy layers. It evaluates proposed actions before execution and returns a risk score, risk level, signals object, recommended_action, policy_result, policy violations, and optional trust receipt ID. It supports self-serve onboarding, trial/prepaid API key flows, and x402 metadata for paid verification.
```

Tags:

```text
developer API, AI infrastructure, autonomous agents, agent safety, policy, governance, trust receipts
```

Links:

- Docs: https://github.com/InterAILabs/ai-risk-oracle
- API reference: https://github.com/InterAILabs/ai-risk-oracle/blob/main/docs/api-reference.md
- OpenAPI: https://ai-risk-oracle.fly.dev/.well-known/openapi.json
- Onboard: https://ai-risk-oracle.fly.dev/onboard

## GitHub/Release Discovery Blurb

```text
InterAI Risk Oracle v0.1.0-beta is a controlled technical beta for agent-native pre-execution verification. Agents can discover pricing and metadata, onboard through self-serve trial/prepaid API keys or x402-compatible paid requests, call /verify before consequential actions, and store trust receipts for audit.
```

## Future MCP Registry Note

```text
InterAI has MCP metadata/readiness, but not a full MCP server submission yet. A registry-specific remote MCP server artifact should be prepared and validated before InterAI is submitted to the MCP Registry or described as listed there.
```

