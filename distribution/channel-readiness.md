# Channel Readiness

This document states what is ready to submit now and what still needs work.

## Summary

| Channel | Readiness | Reason |
|---|---|---|
| GitHub release/topics/search | Ready to send now | Public repo, changelog, README, and release draft exist. Operator still needs to create or confirm the release/topics. |
| x402 ecosystem/directories | Ready to prepare submission now | Hosted pricing metadata exposes x402/Base USDC support. Directory-specific listing assets still need manual submission. |
| OpenAPI/API directories | Ready to send now | Hosted OpenAPI URL and schemas exist. Some directories may require account review or category adaptation. |
| Developer API directories | Ready to send now | API description, docs, OpenAPI, pricing, onboard, and SDK links are available. |
| AI agent/tool directories | Needs adaptation | InterAI fits the category, but each directory needs tailored copy and may favor apps over infrastructure. |
| MCP Registry | Needs adaptation | InterAI has MCP metadata/readiness and a hosted MCP endpoint, but not a full MCP Registry submission artifact yet. |
| A2A/agent-card directories | Needs adaptation | Hosted agent card exists; active directory formats need research and may not be stable. |
| Search/indexing/SEO | Ready to start now | GitHub docs and hosted metadata are public; stronger SEO needs release, topics, backlinks, and later domain. |
| Future domain-owned path | Needs implementation | Requires DNS/TLS/canonical URL plan and hosted metadata updates in a later controlled pass. |

## Ready To Send Now

- GitHub release and topics, after operator confirms release status.
- OpenAPI/API directories that accept a hosted OpenAPI URL.
- Developer API directories that accept hosted APIs and beta services.

## Ready To Prepare Now

- x402 ecosystem/directories using `/pricing` as the source of truth.
- AI agent/tool directories after adapting the category and short copy.

## Needs Adaptation

### MCP Registry

InterAI has MCP metadata/readiness, but not a full MCP server submission yet.

It also has a hosted MCP endpoint. Treat MCP Registry as a submission-adaptation
task until registry-specific metadata is prepared and validated.

Needed before submission:

- registry-specific metadata file;
- namespace ownership/authentication;
- hosted endpoint validation against current registry expectations;
- operator submission.

### A2A/Agent-Card Directories

InterAI has a hosted agent card and A2A endpoint.

Needed before submission:

- identify credible A2A directories;
- confirm submission format;
- decide whether the agent card alone is sufficient;
- submit only after confirming the directory is active and relevant.

## Needs Implementation

### Domain-Owned Path

An owned domain needs infrastructure work. Recommended path:

1. Keep `ai-risk-oracle.fly.dev` for the current beta wave.
2. Configure `oracle.interailabs.com`.
3. Verify TLS and redirects.
4. Update hosted metadata and public docs in a separate controlled pass.

## Not Applicable Yet

- Broad production marketplaces that require high-volume SLA claims.
- Enterprise procurement portals requiring formal security questionnaires.
- Paid marketplace listings that require revenue share terms not yet reviewed.
