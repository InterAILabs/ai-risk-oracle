# Professional Readiness

This is an honest public readiness checklist for InterAI Risk Oracle. It does
not claim enterprise readiness, broad high-volume production readiness, or
external directory approval.

## Current Status

- Product stage: controlled technical beta.
- Hosted service: `https://ai-risk-oracle.fly.dev`
- Primary thesis: Before an agent executes, InterAI verifies.
- Primary category: Autonomous Execution Gateway.
- Primary contract: `autonomous_execution`.
- Support email: `interailabs@gmail.com`
- Security email: `interailabs@gmail.com`
- Current beta pricing: fast `0.010000 USDC`, semantic `0.030000 USDC`, and batch `0.010000 + 0.005000/item`.
- Payment metadata: x402/Base USDC and prepaid API key/trial metadata are
  exposed through `/pricing`.

## Ready Now

- Public landing and `.well-known` discovery metadata.
- Hosted OpenAPI 3.1.0.
- Public schemas, SDK stubs, and examples.
- Self-serve discovery path:
  pricing -> onboard/API key/trial or x402 -> verify -> receipt.
- Trust receipt lookup for autonomous decisions.
- APIs.guru submission recorded as open/pending review.
- Controlled MCP/A2A partner review through hosted metadata and endpoints.

## Not Yet Claimed

- No APIs.guru approval or listing.
- MCP Registry listing is published for the current public beta release.
- No A2A directory listing.
- No broad high-volume production SLA.
- No enterprise procurement readiness.
- No formal security audit claim.

## Pending Before Enterprise Or High-Volume

- Owned domain plan, recommended next host: `oracle.interailabs.com`.
- Reserve `api.interailabs.com` for a future stable API platform path.
- Public status page.
- Privacy policy and terms of service.
- Backup and restore runbook for production operational data.
- Stronger persistent abuse controls for onboarding and trial usage.
- Rate-limit persistence and review of high-volume behavior.
- SDK package publishing process.
- Formal security review before enterprise procurement claims.
- Clear incident response and support escalation process.

## Current Domain Recommendation

Use `ai-risk-oracle.fly.dev` for the current first distribution wave because it
already matches hosted metadata and production smoke coverage.

Plan `oracle.interailabs.com` after initial discovery and telemetry review.
Avoid moving to `api.interailabs.com` until the API surface is stable enough for
a broader platform namespace.

## Operator Rule

Keep public language scoped to controlled technical beta until the pending
domain, status, legal, abuse, backup, and enterprise-readiness items are closed.
