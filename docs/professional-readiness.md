# Professional Readiness

This is an honest public readiness checklist for InterAI Risk Oracle. It does not claim enterprise readiness, broad high-volume production readiness, or external directory approval.

## Current Status

- Product stage: controlled technical beta.
- Hosted service: `https://ai-risk-oracle.fly.dev`
- Primary thesis: Before an agent executes, InterAI verifies.
- Primary positioning: independent pre-execution decision layer for consequential agent actions.
- Primary contract: `autonomous_execution`.
- Legacy compatibility: prompt/response verification remains available but is not the primary product direction.
- Support email: `interailabs@gmail.com`
- Security email: `interailabs@gmail.com`
- Current beta pricing: fast `0.010000 USDC`, semantic `0.030000 USDC`, and batch `0.010000 + 0.005000/item`.
- Payment metadata: x402/Base USDC and prepaid API key/trial metadata are exposed through `/pricing`.

## Positioning Boundary

InterAI does not replace identity, authentication, deterministic permissions, spend limits, domain compliance systems, or required human review.

Those systems answer questions such as who a principal is and whether it is allowed to perform a class of operation. InterAI is intended to answer a narrower contextual question immediately before execution:

**Should this exact proposed action execute now, in this context, under this policy?**

## Ready Now

- Public landing and `.well-known` discovery metadata.
- Hosted OpenAPI 3.1.0.
- Public schemas, SDK sources, and examples.
- Self-serve discovery path: pricing -> onboard/API key/trial or x402 -> verify -> receipt.
- Autonomous action verification with `allow`, `review_required`, and `block` decisions.
- Policy checks for action types, amount limits, risk thresholds, irreversible actions, and receipt requirements.
- Signed trust receipt lookup and signature verification.
- APIs.guru submission recorded as open/pending review.
- MCP Registry publication for the current public beta release.
- Controlled A2A partner review through hosted metadata and endpoints.

## Not Yet Claimed

- No APIs.guru approval or listing.
- No A2A directory listing.
- No broad high-volume production SLA.
- No enterprise procurement readiness.
- No formal security audit claim.
- No claim that trust receipts prove the universal truth of underlying assertions.
- No claim that InterAI replaces mandatory domain-specific or human controls.

## Pending Before Enterprise Or High-Volume

- Owned domain plan and migration decision.
- Public status page.
- Privacy policy and terms of service.
- Backup and restore runbook for production operational data.
- Stronger persistent abuse controls for onboarding and trial usage.
- Rate-limit persistence and review of high-volume behavior.
- Load and soak targets.
- Multi-instance or externalized-state plan.
- Production alerting and operator escalation policy.
- Formal security review before enterprise procurement claims.

## Current Domain Recommendation

Use `ai-risk-oracle.fly.dev` for the current controlled beta because hosted metadata, receipts, documentation, and smoke coverage already use that origin.

Move to an owned domain only as a coordinated migration of API, discovery, registry, receipt, SDK, and documentation surfaces. Do not treat a domain change as a cosmetic DNS-only edit.

## Operator Rule

Keep public language scoped to controlled technical beta until the domain, status, legal, abuse, backup, scaling, and enterprise-readiness items are closed.
