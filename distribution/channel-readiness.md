# Channel Readiness

This document states what is ready to use now and what still requires a current external check or operator action.

## Summary

| Channel | Readiness | Reason |
|---|---|---|
| GitHub release/topics/search | Ready | Public repo, releases, topics, README, Lab/demo links, hosted metadata, and GitHub About all use the current positioning. |
| x402 ecosystem/directories | Prepared | Hosted pricing metadata exposes x402/Base USDC support. Verify each target directory before submission. |
| APIs.guru / OpenAPI Directory | Ready for renewed submission; external acceptance unverified | The hosted OpenAPI identity/request documentation was aligned and revalidated in production at core commit `bdda078784e02e2bc544aaac9b07ac2cc23e8d2b`. Historical issue #2665 exists, but no approval may be claimed. |
| Developer API directories | Ready for targeted submission | Core copy, docs, pricing, onboard, published SDKs, and hosted OpenAPI are coherent; use `registry-submission.md` as current copy and verify each directory before claims. |
| AI agent/tool directories | Needs adaptation | InterAI fits agent-safety / execution-control categories, but each directory needs tailored copy and current availability checks. |
| MCP Registry / MCP directories | Runtime ready; listing state must be rechecked before claims | `server.json` targets `io.github.InterAILabs/ai-risk-oracle` and the hosted Streamable HTTP endpoint. Hosted MCP copy is aligned; third-party listing/health state remains time-sensitive. |
| A2A/agent-card directories | Needs account or adaptation | Hosted legacy and A2A v1 cards exist; verify each directory and submission format before claiming placement. |
| npm TypeScript SDK | Published | `interai-risk-oracle@0.1.3-beta` is present in npm; `latest` and `beta` currently point to `0.1.3-beta`. |
| PyPI Python SDK | Published | `interai-risk-oracle 0.1.3b0` was published through GitHub Actions Trusted Publishing with digital attestations on 2026-09-07. |
| Search/indexing/SEO | Ready for controlled work | GitHub docs and hosted metadata are public. Prefer targeted technical distribution and backlinks over broad claims. |
| Owned-domain path | Deferred | InterAI currently uses `ai-risk-oracle.fly.dev`. An owned domain has not been adopted for this beta and should be handled as a separate infrastructure decision. |

## Current Distribution Source Of Truth

Use these files for current outward-facing copy and checks:

- `README.md`
- `docs/architecture.md`
- `distribution/registry-submission.md`
- `distribution/mcp-readiness.md`
- `distribution/openapi-readiness.md`
- `distribution/channel-readiness.md`
- hosted `/.well-known/*` metadata and `/pricing`

Older release notes, first-wave submissions, submission-result logs, and date-specific manual checklists are historical snapshots. They may preserve older terminology and must not be copied into new outreach without revalidation.

## Immediate Gates

1. Keep Stage 2 frozen; do not start Stage 3 without a real integration requirement.
2. Treat the hosted OpenAPI and MCP identity gates as cleared by the production revalidation at core commit `bdda078784e02e2bc544aaac9b07ac2cc23e8d2b`.
3. Verify each external registry/directory immediately before submission or placement claims.
4. Keep npm/PyPI publication metadata synchronized on the next real release; do not cut a release solely for copy changes.
5. Use targeted distribution and measure independent adoption before expanding product scope.

## MCP

Current identifier and hosted endpoint:

```text
io.github.InterAILabs/ai-risk-oracle
https://ai-risk-oracle.fly.dev/mcp
```

The endpoint has been observed healthy by external MCP monitoring. Registry/listing state,
third-party scores, ownership/analytics status, and tool-health timestamps are time-sensitive;
verify them immediately before outreach or a placement claim.

## A2A

InterAI exposes:

```text
https://ai-risk-oracle.fly.dev/.well-known/agent.json
https://ai-risk-oracle.fly.dev/.well-known/agent-card.json
https://ai-risk-oracle.fly.dev/a2a
https://ai-risk-oracle.fly.dev/a2a/v1
```

Before submission, confirm the target directory is active, relevant, and supports the
corresponding A2A profile.

## Not Applicable Yet

- Broad production marketplaces that require high-volume SLA claims.
- Enterprise procurement portals requiring formal security questionnaires.
- Paid marketplace listings that require revenue-share terms not yet reviewed.
- Stage 3 provider-authority claims; external evidence remains non-authoritative in Stage 2.
