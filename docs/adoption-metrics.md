# Adoption Metrics

This document defines privacy-conscious metrics for autonomous execution adoption.
The hosted service exposes an admin-only aggregate summary for operators; no
public endpoint exposes raw adoption telemetry.

## Funnel

Track the path:

```text
discover -> pricing -> onboard/API key/trial or x402 -> verify -> receipt lookup
```

## Implemented Operator Summary

Operators can review aggregate adoption telemetry through the private admin
endpoint:

```text
GET /admin/adoption/summary
```

The summary is intended for internal readiness review and distribution planning.
It reports `last_24h`, `last_7d`, and `all_time` windows using safe counters and
distributions.

Tracked adoption events include:

- landing and discovery views
- pricing views
- onboarding creation
- first verification per account
- total verification completions
- trust receipt creation
- trust receipt lookup
- x402 payment-required responses
- topup creation and confirmation
- trial exhaustion
- API errors

The summary may include distributions for:

- `recommended_action`
- `policy_result`
- `risk_level`
- payment mode
- status code
- billed microusdcs

This endpoint requires admin authentication. Do not publish raw output without
operator review.

## Discovery Metrics

- landing views
- OpenAPI views
- agent card views
- AI service descriptor views
- discovery bundle views
- autonomous adoption descriptor views
- pricing views

## Activation Metrics

- onboarding attempts
- successful account creation
- trial credit issued
- first successful verification
- first trust receipt issued
- first trust receipt lookup

## Usage Metrics

- autonomous verification count
- decision mix: `allow`, `review_required`, `block`
- average risk score
- policy violation count
- receipt issuance rate
- receipt lookup rate

## Payment Metrics

- prepaid API key usage
- topup created
- topup confirmed
- x402 payment-required responses
- x402 settlements
- insufficient balance responses

## Quality Metrics

- verification latency
- readiness failures
- 4xx and 5xx rates
- timeout count
- rate-limit count
- smoke credential revocation success

## Privacy And Safety

- Do not store raw API keys.
- Do not store raw prompts or raw agent/user payloads.
- Do not store raw request/response bodies.
- Do not expose secrets in logs or dashboards.
- Keep account IDs and payment identifiers as operational data.
- Aggregate by date and route before sharing externally.
- Treat full wallet addresses, payment transaction identifiers, and account IDs
  as operational data.
- Share public adoption numbers only after operator review.
