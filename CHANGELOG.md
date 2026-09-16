# Changelog

## Service and discovery metadata 0.1.3-beta.1

- Move all active public discovery surfaces to the canonical `https://api.interailabs.dev` identity and MCP remote `https://api.interailabs.dev/mcp`.
- Republish MCP Registry metadata as `0.1.3-beta.1` so downstream registries can replace the immutable older metadata snapshot.
- Align static MCP, A2A, OpenAPI, service discovery, and citation metadata on `0.1.3-beta.1` with no decision-engine, API-shape, pricing, billing, policy-authority, or execution-semantics change.
- Add GitHub Actions OIDC publishing for future MCP Registry metadata releases without a dedicated registry secret.
- Keep public uptime checks bound only to the canonical InterAI API domain.
- SDK package releases remain `0.1.7-beta` for TypeScript and `0.1.7b0` for Python.

## SDK packages 0.1.7-beta / 0.1.7b0

- Expose the controlled `demo_trial` onboarding scope in the package-facing TypeScript and Python clients so a new builder can reach a first hosted verification without funding an account first.
- Keep trial creation subject to the hosted TTL, per-client limits, shared credit budget, and maximum-verification controls; the SDK does not bypass or enlarge trial authority.
- Route TypeScript package exports through a public entrypoint that reports `typescript-sdk/0.1.7-beta` while preserving the existing execution-boundary implementation.
- Route Python package exports through a public client that reports `python-sdk/0.1.7-beta` and makes `get_trust_receipt()` reject an anonymous `public_summary` instead of treating it as complete owner evidence.
- Add zero-funding builder quickstarts for both SDKs. Hosted runtime behavior, pricing, billing, policy authority, and decision semantics remain unchanged.

## SDK packages 0.1.6-beta / 0.1.6b0

- Refresh npm/PyPI package metadata and bundled READMEs to use the canonical API domain `https://api.interailabs.dev`.
- No API shape, behavior, pricing, billing, policy, execution-boundary, or receipt semantics change.

## SDK packages 0.1.5-beta / 0.1.5b0

- Fix SDK self-identification so `x-interai-client` reports the actual published SDK version.
- Export and test a shared TypeScript `SDK_VERSION` constant to prevent package metadata and telemetry from drifting again.
- Align the Python `SDK_VERSION`, package metadata, package README, and builder contract to the same release.
- Preserve hosted runtime behavior, pricing, billing, policy semantics, and public API contracts unchanged.

## SDK packages 0.1.4-beta / 0.1.4b0

- Add builder-safe onboarding helpers that retain the issued API key.
- Add account inspection helpers for `/me`, ledger, and usage.
- Add quote and prepaid top-up create/status/confirm helpers.
- Add bounded batch verification to the public SDK surfaces.
- Add configurable request timeouts and structured HTTP error metadata.
- Preserve the existing fail-closed execution-intent binding, receipt verification, and durable replay contract.
- Add public CI covering TypeScript typecheck/build, offline builder contracts, durable execution-boundary tests, npm package inspection, Python compilation/contracts, and Python package build.
- Keep the hosted service/discovery runtime version at `0.1.3-beta`; this entry versions SDK distribution artifacts only.

## v0.1.3-beta

- Publish fast pricing at `0.010000 USDC` and semantic pricing at
  `0.030000 USDC`.
- Publish batch pricing at `0.010000 USDC + 0.005000 USDC/item`.
- Align the isolated demo trial to `0.050000 USDC` for five fast calls.
- Document the explicit production facilitator requirement for Base Mainnet.
- Align SDK, discovery, MCP Registry, and package metadata to `0.1.3-beta`.

## v0.1.2-beta

- Lead with the agent tool-call policy-gate use case.
- Document the one-click guided demo and privacy-safe activation stages.
- Make the TypeScript and Python SDK directories buildable package sources.
- Generate idempotency keys by default in both public clients.
- Record A2A v1 and MCP as production-backed interfaces where documented.
- Add portable trust-receipt signature envelopes and SDK helpers.
- Use Certifi in the Python package for portable TLS verification.
- Add an official MCP Registry `server.json` for the hosted Streamable HTTP endpoint.

## Unreleased

### Added

- Professional readiness checklist documenting what is ready now and what is
  still pending before enterprise or high-volume claims.
- Draft `v0.1.1-beta` readiness release notes for OpenAPI validation and public
  distribution state.
- Public pricing review notes documenting the unchanged beta price and future
  review points.
- Clean public repository structure for hosted API discovery.
- Public documentation, schemas, discovery metadata, SDK stubs, and examples.
- Proprietary core notice clarifying that hosted service internals are excluded.

### Changed

- Channel readiness now records APIs.guru issue #2665 as submitted pending
  review, not merely prepared.
- Manual submission instructions now reflect the next manual pass and include
  both Arch Tools failed request IDs.
- GitHub release and cleanup state now records `v0.1.1-beta` as created, old
  PR #1 as closed, and the superseded public branch as deleted.

## v0.1.0-beta

### Added

- Autonomous Execution Gateway public beta for controlled technical testers.
- Agent-native and human self-serve adoption path:
  `/pricing`, `/onboard`, `/verify`, decision handling, and receipt storage.
- `.well-known` discovery metadata for hosted integration.
- Autonomous adoption contract for agents and builders.
- OpenAPI, A2A, and MCP metadata.
- x402/Base USDC support alongside prepaid API key and trial metadata.
- Trust receipts for audit and downstream governance.
- Public/private repository boundary for SDKs, schemas, examples, and hosted
  service internals.

### Notes

- This is a controlled technical beta, not a broad high-volume self-serve
  production declaration.
- See [docs/distribution-checklist.md](docs/distribution-checklist.md) for
  distribution and operational readiness notes.