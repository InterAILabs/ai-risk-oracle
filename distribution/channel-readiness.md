# Channel Readiness

This document states what is ready to submit now and what still needs work.

## Summary

| Channel | Readiness | Reason |
|---|---|---|
| GitHub release/topics/search | Release created | Public repo, changelog, README, `v0.1.0-beta`, and `v0.1.1-beta` pre-releases exist. Operator still needs to confirm topics and repo metadata. |
| x402 ecosystem/directories | Prepared | Hosted pricing metadata exposes x402/Base USDC support. Channel-specific packages exist in `distribution/submissions/`. |
| APIs.guru / OpenAPI Directory | Submitted pending review | Issue #2665 is open at APIs.guru. InterAI is not approved or listed yet. |
| FindAPI | Prepared | Submission form exists and the developer API package includes field-ready copy. |
| APIKeyHub | Blocked: needs account | Public site exposes API/MCP directory and dashboard submission flow; operator account action is needed. |
| Developer API directories | Prepared | API description, docs, OpenAPI, pricing, onboard, and SDK links are available. |
| AI agent/tool directories | Needs adaptation | InterAI fits the category, but each directory needs tailored copy and may favor apps over infrastructure. |
| MCP Registry | Validated; authentication/publish pending | `server.json` passed `mcp-publisher v1.8.1 validate`; the hosted Streamable HTTP endpoint passes the official TypeScript client handshake and tool-call test. |
| A2A/agent-card directories | Needs account or adaptation | Hosted agent card exists; active directories generally require register/submit flows or category review. |
| Search/indexing/SEO | Ready to start now | GitHub docs and hosted metadata are public; stronger SEO needs release, topics, backlinks, and later domain. |
| Future domain-owned path | Needs implementation | Requires DNS/TLS/canonical URL plan and hosted metadata updates in a later controlled pass. |

## Ready To Send Now

- GitHub repository topics and metadata, after operator confirms the exact topic
  list.
- FindAPI, after operator approves one targeted manual form.
- Arch Tools x402 Service Directory, after operator approves one targeted manual
  form.

## Submitted Pending Review

- APIs.guru / OpenAPI Directory: issue #2665 is open and pending maintainer
  review. Do not claim approval or listing until APIs.guru confirms it.

## Ready To Prepare Now

- x402 ecosystem/directories using `/pricing` as the source of truth.
- AI agent/tool directories after adapting the category and short copy.
- APIKeyHub, after an operator account is available.

## Needs Adaptation

### MCP Registry

InterAI has a registry-specific `server.json` for its public hosted remote:

```text
io.github.interailabs/ai-risk-oracle
https://ai-risk-oracle.fly.dev/mcp
```

The artifact passed the official registry validator on 2026-08-24. The endpoint
also passes initialize, tools/list, and a public tool call with
`@modelcontextprotocol/client@2.0.0` in legacy/2025 compatibility mode.

Needed before submission:

- GitHub namespace authentication for the `InterAILabs` organization;
- `mcp-publisher publish`;
- registry API confirmation before claiming a listing.

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
