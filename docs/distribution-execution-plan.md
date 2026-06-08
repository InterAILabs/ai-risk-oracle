# Autonomous Distribution Execution Plan

This plan turns the public beta package into an execution checklist for
distribution channels.

It does not claim InterAI is already listed in any external directory. Each
channel below needs an operator submission, review, or follow-up.

## Distribution Matrix

| Channel | Purpose | Fit for InterAI | Required assets | Current status | Blocking gaps | Next action | Manual/automatable | Priority |
|---|---|---|---|---|---|---|---|---|
| GitHub release, topics, and search | Make the public repo discoverable to developers, agents, and registry crawlers. | Strong fit. The public repo is the canonical integration surface. | README, changelog, release notes, topics, description, homepage, docs links. | Release notes draft exists. README and changelog are beta-ready. | Need operator to create or confirm the GitHub release and topics. | Create or update `v0.1.0-beta` release as pre-release, add repo topics, verify repository description/homepage. | Manual now; later automatable through release workflow. | P0 |
| MCP Registry | Make InterAI discoverable to MCP clients and ecosystem indexes. | Good fit if the hosted MCP endpoint is packaged as a registry-ready remote server entry. | MCP endpoint, tool list, `server.json` or registry metadata, namespace ownership, docs, security notes. | InterAI has MCP metadata/readiness and a hosted MCP endpoint, but not a full MCP Registry submission artifact yet. | Need registry-specific `server.json`, validation against current MCP Registry requirements, and submission/auth flow. | Prepare a remote MCP server submission artifact and test it before claiming registry readiness. | Mostly manual first time; metadata generation can be automated later. | P0 |
| x402 ecosystem and directories | Reach agents/services looking for paid HTTP resources and x402-compatible APIs. | Strong fit because `/verify` supports paid verification and Base USDC/x402 metadata. | Pricing URL, x402 payment requirements, Base USDC details, service description, example paid request, support contact. | x402 support is documented and exposed through hosted pricing metadata. | Need listing-specific copy and any required proof/demo from the x402 ecosystem directory. | Prepare x402 listing asset using `distribution/submission-assets.md`; submit to x402 ecosystem channels manually. | Manual submission; checks can be automated. | P0 |
| OpenAPI and API directories | Expose the hosted API to developers, API search engines, and agent tooling. | Strong fit. InterAI has hosted OpenAPI and public schemas. | OpenAPI URL, service category, auth model, pricing URL, docs, example request/response. | OpenAPI is hosted and public. Public repo has schema docs. | Need directory-specific submission formats; some directories require manual moderation. | Submit to OpenAPI/API directories that accept hosted specs and developer APIs. | Manual first pass; monitoring can be automated. | P1 |
| AI agent and tool directories | Position InterAI as pre-execution infrastructure for autonomous agents. | Strong narrative fit; varies by directory quality. | One-line description, agent use cases, screenshots optional, links, trust receipt explanation. | Submission assets are ready after this plan. | Need channel list, anti-spam selection, and tailored descriptions. | Select 5-10 credible directories; submit manually with beta scope. | Manual. | P1 |
| Developer API directories | Reach developers searching for paid APIs, AI infrastructure, risk, governance, and agent tooling. | Good fit if listed as developer infrastructure rather than consumer AI app. | API description, OpenAPI URL, docs URL, pricing/onboarding URL, SDK links. | Public assets exist. | Need account creation and directory-specific categories. | Submit to developer API directories after GitHub release is final. | Manual first pass. | P1 |
| A2A and agent-card directories | Make the agent card discoverable where A2A catalogs exist. | Conditional fit. InterAI exposes an agent card and A2A endpoint, but directories may be immature. | Agent card URL, A2A endpoint, skill list, examples, security notes. | Hosted agent card exists. | Need identify active A2A directories and their submission formats. | Monitor ecosystem and submit only to credible A2A indexes. | Manual research now; automate later if directories stabilize. | P2 |
| Search, indexing, and SEO | Make docs and hosted metadata easy to find by humans and crawlers. | Strong fit. The public repo and hosted `.well-known` endpoints are crawlable. | README, docs, metadata URLs, repository topics, backlinks, domain plan. | Public repo content is ready; Fly URL works. | No custom domain yet; limited external backlinks. | Add GitHub topics, release, directory backlinks, and decide domain route. | Mixed: manual setup, automated checks. | P0 |
| Future domain-owned path | Move from Fly subdomain to a durable brand-controlled endpoint. | Strong fit for credibility and long-term distribution. | Domain, DNS, TLS, canonical URL policy, redirects, metadata update plan. | Hosted service runs on `ai-risk-oracle.fly.dev`. | Need domain choice, DNS ownership, Fly cert setup, canonical URL migration plan. | Choose domain route and plan migration after beta distribution starts. | Manual infrastructure step. | P1 |

## Execution Order

1. Finalize GitHub release and repository topics.
2. Submit to x402 ecosystem channels with current hosted pricing metadata.
3. Prepare MCP Registry remote server submission artifact.
4. Submit to OpenAPI and developer API directories.
5. Add selected AI agent/tool directories.
6. Decide domain route and update canonical metadata in a later product-safe pass.

## Reference Channels

Use these as starting points for operator review. Do not treat inclusion here as
an endorsement or listing.

- MCP Registry: https://modelcontextprotocol.io/registry/about
- Official MCP Registry browser: https://registry.modelcontextprotocol.io
- x402 ecosystem: https://www.x402.org/ecosystem
- OpenAPI Directory: https://www.openapidirectory.com
- APIKeyHub: https://apikeyhub.com
- FindAPI: https://www.findapi.dev
- saxi.ai API directory: https://saxi.ai

## MCP Registry Assessment

InterAI has MCP metadata/readiness, but not a full MCP server submission yet.

It also has a hosted MCP endpoint. Treat MCP Registry as a submission-adaptation
task until registry-specific metadata is prepared and validated.

Do not claim MCP Registry listing until:

- a registry-specific server metadata file exists;
- namespace ownership is verified;
- the hosted MCP endpoint is validated against current registry expectations;
- an operator completes the registry submission flow.

## x402 Readiness Assessment

InterAI is ready to prepare an x402 listing asset. Do not perform payments during
distribution setup.

Use hosted `/pricing` as the source of truth for:

- current x402 support;
- Base network metadata;
- USDC asset details;
- prepaid API key and trial availability;
- verify and batch verify costs.

## Domain Recommendation

### Continue With `ai-risk-oracle.fly.dev`

Pros:

- already live;
- already referenced by hosted metadata and public docs;
- fastest path for technical beta submissions.

Cons:

- weaker brand trust than an owned domain;
- harder to remember;
- less ideal for long-term SEO and partner review.

### Move To `api.interailabs.com`

Pros:

- best long-term API platform shape;
- can host multiple future InterAI APIs;
- clear production/API boundary.

Cons:

- less product-specific than oracle naming;
- requires careful path/version planning if more services appear.

### Move To `oracle.interailabs.com`

Pros:

- product-specific and memorable;
- maps well to InterAI Risk Oracle;
- good for agent and registry submissions.

Cons:

- narrower than a platform-wide API domain;
- may need redirects if future products consolidate under `api.interailabs.com`.

### Recommendation

Use `ai-risk-oracle.fly.dev` for the current `v0.1.0-beta` distribution wave.
Plan `oracle.interailabs.com` as the next canonical domain for this product, with
`api.interailabs.com` reserved for future platform-level APIs.

Do not change hosted metadata until the domain is configured, TLS is verified,
and redirects/canonical URLs are planned.
