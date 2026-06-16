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

For backwards compatibility, `adoption.windows` remains raw `all_traffic`.
Operators should prefer `adoption.traffic_segments.<window>.external_only` for
distribution and adoption interpretation when that field is present.

Traffic segments:

- `all_traffic`: raw counters, including historical and internal traffic.
- `external_only`: public/external traffic after excluding monitor, admin,
  smoke/audit, and unknown historical events.
- `internal_monitoring`: local monitor and admin traffic.
- `smoke_or_audit`: self-serve smoke/audit account activity.
- `unknown_or_historical`: older or incomplete records that cannot be safely
  classified.

Events before source classification was introduced are not deleted or rewritten.
They may remain mixed in raw windows or appear under fallback classification.
Treat pre-change adoption numbers as raw/mixed unless the external-only segment
is available and reviewed.

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
- source breakdown
- error breakdown by status, route, source, and category

This endpoint requires admin authentication. Do not publish raw output without
operator review.

Error categories:

- `expected_auth_or_payment_errors`: expected 401/402/403 auth or payment-path
  responses. A 402 payment-required response is not confirmed revenue and is not
  a server incident by itself.
- `invalid_requests`: malformed or invalid 4xx requests.
- `monitor_or_admin`: local monitor or admin-route failures.
- `real_server_errors`: 5xx server errors requiring investigation.
- `unknown`: events that cannot be classified from aggregate fields.

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
