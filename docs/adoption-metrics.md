# Adoption Metrics

This document defines privacy-conscious metrics for autonomous execution
adoption.

## Funnel

Track the path:

```text
discover -> pricing -> onboard/API key/trial or x402 -> verify -> receipt lookup
```

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
- Do not expose secrets in logs or dashboards.
- Aggregate by date and route before sharing externally.
- Treat full wallet addresses, payment transaction identifiers, and account IDs
  as operational data.
- Share public adoption numbers only after operator review.

