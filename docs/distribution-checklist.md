# Distribution Checklist

This checklist is for controlled tester onboarding, ecosystem submissions, and partner
handoffs.

## Ready Now

- Hosted landing page presents InterAI as an Autonomous Execution Gateway.
- Hosted discovery exposes OpenAPI, agent card, AI service, discovery bundle,
  and autonomous adoption metadata.
- Public repository documents the autonomous execution contract.
- Self-serve path is discoverable: pricing -> onboard/API key/trial or x402 ->
  verify -> receipt.
- Contact email is for support, security, enterprise access, partnerships, and
  manual integration help, not required for default access.
- Trust receipts are part of the primary adoption path.

## Controlled Beta Scope

InterAI is ready for controlled beta testers and partner review when operators confirm:

- production `/health` is healthy
- production `/ready` is ready
- hosted discovery endpoints resolve
- `/pricing` advertises onchain production mode
- smoke verification uses a temporary or approved safe credential only
- temporary smoke credentials are revoked after testing

## Not Yet Broad Self-Serve

Before broad self-serve traffic, operators should address or explicitly approve:

- single small Fly machine
- single Fly volume for SQLite persistence
- in-memory rate limiting
- no automated public backup and restore proof in this repo
- no custom domain configured in the current Fly audit
- trial onboarding abuse controls are basic
- high-volume concurrency is unproven

## High-Volume Readiness

High-volume traffic should wait for:

- documented backup and restore process
- load and soak test targets
- stronger abuse controls for onboarding and trial credit
- multi-instance or externalized state plan
- production alerting with thresholds
- operator escalation policy

## External Submission Safety

- Use `distribution/registry-profile.json` as the source profile.
- Use `distribution/registry-submission.md` as the human draft.
- Do not announce external registry placement until the external operator
  confirms it.
- Keep hosted metadata as the source of truth for pricing and payment details.
