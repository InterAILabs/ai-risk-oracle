# x402 Ecosystem Submission Package

## Channel

x402 ecosystem/directories:

- https://www.x402.eco
- https://www.x402.solutions/
- https://archtools.dev/directory

## Status

`prepared`

## Submission Method

Manual targeted submission.

Known paths:

- `x402.solutions`: web form with review/feature consent.
- `Arch Tools x402 Service Directory`: web form asking for service name, URL,
  description, and contact email.
- `x402.eco`: ecosystem directory with a GitHub contribute link; confirm the
  expected data format before opening a PR.

## Title

```text
InterAI Risk Oracle
```

## Short Description

```text
x402-compatible Autonomous Execution Gateway for pre-execution verification.
```

## Long Description

```text
InterAI Risk Oracle lets autonomous agents verify proposed actions before execution. It exposes self-serve pricing and onboarding, supports prepaid API keys and trial metadata, and exposes x402/Base USDC metadata for paid verification flows. Verification responses include recommended_action, policy_result, score, risk_level, signals, and trust receipt metadata so agents can allow, route for review, or block under policy.
```

## Tags

```text
x402, Base USDC, autonomous agents, AI agents, agent payments, pre-execution verification, execution gateway, trust receipts, developer API
```

## Links

- Homepage: https://ai-risk-oracle.fly.dev
- GitHub repo: https://github.com/InterAILabs/ai-risk-oracle
- Release URL: https://github.com/InterAILabs/ai-risk-oracle/releases/tag/v0.1.0-beta
- Hosted service URL: https://ai-risk-oracle.fly.dev
- Pricing URL: https://ai-risk-oracle.fly.dev/pricing
- Onboard URL: https://ai-risk-oracle.fly.dev/onboard
- OpenAPI URL: https://ai-risk-oracle.fly.dev/.well-known/openapi.json
- AI service descriptor URL: https://ai-risk-oracle.fly.dev/.well-known/ai-service.json
- Discovery bundle URL: https://ai-risk-oracle.fly.dev/.well-known/discovery-bundle.json
- Autonomous adoption URL: https://ai-risk-oracle.fly.dev/.well-known/autonomous-adoption.json

## Pricing/Self-Serve Path

```text
discover -> pricing -> onboard/API key/trial or x402 -> verify -> decision -> store receipt
```

Use the hosted pricing endpoint for current x402/Base USDC details:

```text
https://ai-risk-oracle.fly.dev/pricing
```

## OpenAPI URL

```text
https://ai-risk-oracle.fly.dev/.well-known/openapi.json
```

## Autonomous Adoption URL

```text
https://ai-risk-oracle.fly.dev/.well-known/autonomous-adoption.json
```

## Release URL

```text
https://github.com/InterAILabs/ai-risk-oracle/releases/tag/v0.1.0-beta
```

## Beta Scope

Controlled technical beta for x402-aware agents, wallet/payment agents, API
infrastructure reviewers, and autonomous workflow builders.

## What Not To Claim

- Do not claim InterAI is already featured in any x402 directory.
- Do not hard-code pricing values if the directory can link to `/pricing`.
- Do not perform real payments for listing preparation.
- Do not claim high-volume production readiness.
- Do not claim official ecosystem approval.

## Exact Next Action

1. For Arch Tools, submit one targeted review form using:
   - Service Name: `InterAI Risk Oracle`
   - URL: `https://ai-risk-oracle.fly.dev`
   - Description: use the short or long description above.
   - Contact Email: use the operator-approved InterAI support contact.
2. For `x402.solutions`, submit only after an operator approves the review and
   potential feature consent.
3. For `x402.eco`, inspect the GitHub contribution format first. Open a PR only
   if the repository clearly accepts service entries and the expected data shape
   is unambiguous.
