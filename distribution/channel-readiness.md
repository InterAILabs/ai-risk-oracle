# Channel Readiness

This document states what is ready to submit now and what still needs work.

## Summary

| Channel | Readiness | Reason |
|---|---|---|
| GitHub release/topics/search | Ready to submit | Public repo, changelog, README, and release exist. Operator still needs to confirm topics and repo metadata. |
| x402 ecosystem/directories | Prepared | Hosted pricing metadata exposes x402/Base USDC support. Channel-specific packages exist in `distribution/submissions/`. |
| APIs.guru / OpenAPI Directory | Prepared | Hosted OpenAPI URL exists and APIs.guru accepts API requests through its Add API form. |
| FindAPI | Prepared | Submission form exists and the developer API package includes field-ready copy. |
| APIKeyHub | Blocked: needs account | Public site exposes API/MCP directory and dashboard submission flow; operator account action is needed. |
| Developer API directories | Prepared | API description, docs, OpenAPI, pricing, onboard, and SDK links are available. |
| AI agent/tool directories | Needs adaptation | InterAI fits the category, but each directory needs tailored copy and may favor apps over infrastructure. |
| MCP Registry | Blocked: needs MCP server package | InterAI has MCP metadata/readiness and a hosted MCP endpoint, but not a full MCP Registry `server.json` submission package yet. |
| A2A/agent-card directories | Needs account or adaptation | Hosted agent card exists; active directories generally require register/submit flows or category review. |
| Search/indexing/SEO | Ready to start now | GitHub docs and hosted metadata are public; stronger SEO needs release, topics, backlinks, and later domain. |
| Future domain-owned path | Needs implementation | Requires DNS/TLS/canonical URL plan and hosted metadata updates in a later controlled pass. |

## Ready To Send Now

- GitHub release topics and repository metadata, after operator confirms the
  exact topic list.
- APIs.guru Add API form, after operator approves the external request.
- FindAPI, after operator approves one targeted manual form.
- Arch Tools x402 Service Directory, after operator approves one targeted manual
  form.

## Ready To Prepare Now

- x402 ecosystem/directories using `/pricing` as the source of truth.
- AI agent/tool directories after adapting the category and short copy.
- APIKeyHub, after an operator account is available.

## Needs Adaptation

### MCP Registry

InterAI has MCP metadata/readiness, but not a full MCP Registry submission
package yet.

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
