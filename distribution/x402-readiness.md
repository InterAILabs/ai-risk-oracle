# x402 Readiness

InterAI Risk Oracle supports hosted self-serve prepaid API keys and x402 payment
negotiation for paid verification flows.

## Discovery

- Pricing metadata: `GET https://ai-risk-oracle.fly.dev/pricing`
- Verify endpoint: `POST https://ai-risk-oracle.fly.dev/verify`
- Batch verify endpoint: `POST https://ai-risk-oracle.fly.dev/verify/batch`

## Payment Metadata

Use the hosted pricing endpoint as the source of truth for:

- current USDC price per service
- Base network metadata
- available x402 requirements
- prepaid API key and trial availability
- topup receive address

Do not hard-code operational payment values in clients when the pricing endpoint can be
used.

## Client Behavior

1. Try bearer auth with a prepaid API key when available.
2. If using x402, read the `402 Payment Required` response and satisfy one of
   the advertised requirements.
3. Resubmit with the payment signature header.
4. Store the returned decision and trust receipt metadata.

## Current Status

Ready for controlled x402 client testing. Do not perform real payment tests without an
explicit test plan and operator approval.
