# Distribution Checklist

This checklist is for controlled tester onboarding, ecosystem submissions, and partner handoffs.

## Ready Now

- Hosted landing presents InterAI as an **independent pre-execution decision layer for consequential agent actions**.
- The Action Boundary Lab makes the execution boundary interactive without performing the proposed side effect.
- The controlled safe demo provides a limited read-only sandbox path with a real trust receipt.
- Hosted discovery exposes OpenAPI, agent card, AI service, discovery bundle, and autonomous adoption metadata.
- Public repository documents the autonomous execution contract and the current `HOST -> ACCOUNT -> CALLER -> EFFECTIVE` authority model.
- Framework examples cover OpenAI Agents SDK, Mastra, and Google ADK at the pre-tool execution boundary.
- Self-serve path is discoverable: pricing -> onboard/API key/trial or x402 -> verify -> receipt.
- Contact email is for support, security, partnerships, and manual integration help, not required for default access.
- Trust receipts are part of the primary adoption path.

## Human Surface Check

Before sending a new audience to InterAI, confirm that human-facing navigation stays within the intentional InterAI product experience:

- `/` — product landing
- `/lab` — Action Boundary Lab
- `/demo` — controlled safe demo
- `/pricing` — browser presentation, while API clients retain the JSON representation
- `/pilot` — design-partner application
- `/trust/receipts/{id}` — human receipt presentation for browsers, JSON for API clients

Protocol surfaces such as health, OpenAPI, MCP, A2A, schemas, and discovery remain deliberately machine-first rather than being disguised as marketing pages.

## Controlled Beta Scope

InterAI is ready for controlled beta testers and partner review when operators confirm:

- production `/health` is healthy
- production `/ready` is ready
- hosted discovery endpoints resolve
- `/pricing` JSON advertises the current production payment mode and pricing
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
- account policy administration is InterAI-administered rather than customer self-service

## High-Volume Readiness

High-volume traffic should wait for:

- documented backup and restore process
- load and soak test targets
- stronger abuse controls for onboarding and trial credit
- multi-instance or externalized state plan
- production alerting with thresholds
- operator escalation policy

## External Submission Safety

- Treat historical submission drafts as records of what was submitted at that time, not as the current positioning source of truth.
- Use current README, hosted landing, current policy docs, and live discovery metadata when preparing new submissions.
- Do not announce external registry placement until the external operator confirms it.
- Keep hosted metadata as the source of truth for pricing and payment details.
