# Distribution Submission Tracker

This tracker is the working board for Autonomous Distribution Execution v1.

Date of this pass: 2026-06-08.

No external listing, approval, or directory publication is claimed here. Status
values describe InterAI's internal readiness and the next operator action.

Allowed status values:

- `not_started`
- `ready_to_submit`
- `prepared`
- `submitted`
- `submitted_pending_review`
- `ready_for_manual_submit`
- `failed`
- `blocked_needs_auth`
- `blocked_needs_account`
- `blocked_needs_terms_acceptance`
- `blocked_needs_captcha`
- `blocked_needs_payment`
- `blocked_unclear_submission_path`
- `blocked_needs_domain`
- `blocked_needs_mcp_server`
- `not_applicable`

## Tracker

| Channel | URL | Category | Priority | Status | Ready now? | Account needed? | Submission type | Manual/automatable | Source asset | Next action | Follow-up date | Notes |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| GitHub release/topics/search | https://github.com/InterAILabs/ai-risk-oracle | Source repository | P0 | `ready_to_submit` | Yes | GitHub maintainer | Repo metadata and release hygiene | Manual metadata update | README, CHANGELOG, release, `distribution/submission-assets.md` | Confirm repo description, homepage, and topics from the exact topic list below. | 2026-06-10 | Release `v0.1.0-beta` exists as a pre-release. Do not claim directory presence from GitHub metadata alone. |
| APIs.guru / OpenAPI Directory | https://github.com/APIs-guru/openapi-directory/issues/2665 | OpenAPI aggregation | P0 | `submitted_pending_review` | Yes | Submitted by InterAILabs | GitHub issue | Manual follow-up | `distribution/submissions/openapi-directory.md` | Monitor issue #2665 and respond if maintainers request changes. | 2026-06-17 | Issue title: `Add "InterAI Risk Oracle" API`. Current state: open / pending review. Format: openapi. Official: true. OpenAPI URL: `https://ai-risk-oracle.fly.dev/.well-known/openapi.json`. Name: InterAI Risk Oracle. Category: tools. This is not approved or listed yet. |
| OpenAPI Directory MCP Server | https://www.openapidirectory.com | OpenAPI search/MCP access | P2 | `not_started` | Unclear | Unknown | Unknown | Manual research | Hosted OpenAPI URL | Research whether this site accepts provider submissions or only indexes upstream APIs.guru/OpenAPI data. | 2026-06-14 | Treat as indirect until submission route is confirmed. |
| FindAPI | https://www.findapi.dev/submit | Developer API directory | P1 | `blocked_needs_captcha` | Yes | No login shown | Web form with Cloudflare Turnstile | Manual | `distribution/submissions/developer-api-directory.md` | Submit manually in browser after completing Turnstile. | 2026-06-09 | Form asks for API name, website, description, use cases, auth type, CORS, protocol, pricing, and free-note fields. |
| APIKeyHub | https://apikeyhub.com/dashboard | API and MCP directory | P1 | `blocked_needs_account` | Likely | Yes | Dashboard submission | Manual | `distribution/submissions/developer-api-directory.md` | Operator must log in or use an existing account, then submit through dashboard. | 2026-06-14 | Public site shows recently approved community submissions and a dashboard submit flow. |
| API Map | https://apimap.dev | API directory for AI agents | P2 | `prepared` | Conditional | Unknown | Contact or unknown | Manual | `distribution/submissions/developer-api-directory.md` | Use only as a single targeted contact/submission if operator confirms channel fit. | 2026-06-14 | Strong agent-indexing fit, but no clear self-serve submit endpoint was found. |
| x402.eco ecosystem | https://www.x402.eco | x402 ecosystem discovery | P0 | `blocked_unclear_submission_path` | Yes | Unknown | Unknown or community contribution | Manual | `distribution/submissions/x402-ecosystem.md` | Ask maintainers for the canonical contribution format before opening a PR. | 2026-06-09 | Page is active, but the submission data shape was not confirmed. No PR was opened. |
| x402.solutions ecosystem | https://www.x402.solutions/ | x402 ecosystem listing | P1 | `blocked_needs_terms_acceptance` | Yes | No account shown | Web form with review/feature consent | Manual | `distribution/submissions/x402-ecosystem.md` | Submit only after operator accepts the review and potential feature consent. | 2026-06-09 | Form states that submitted projects may be reviewed and potentially featured. |
| Arch Tools x402 Service Directory | https://archtools.dev/directory | x402 service directory | P0 | `failed` | Yes | No account shown | Public POST review endpoint | Manual retry or contact | `distribution/submissions/x402-ecosystem.md` | Retry manually or contact Arch Tools with request ID if form remains broken. | 2026-06-09 | Automated safe submission attempts returned HTTP 500 with request IDs; no successful submission confirmation was received. |
| MCP Registry | https://modelcontextprotocol.io/registry | MCP ecosystem | P1 | `blocked_needs_mcp_server` | No | Authentication required | `server.json` publish flow | Manual first, automatable later | `distribution/submissions/mcp-registry-future.md` | Build and validate a registry-specific `server.json` before any publish attempt. | 2026-06-21 | InterAI has MCP metadata/readiness, but not a full MCP Registry submission package yet. |
| A2A Registry | https://www.a2a-registry.org | A2A/agent card directory | P2 | `blocked_needs_account` | Conditional | Yes | Register/submit agent | Manual | Hosted agent card, `distribution/submissions/developer-api-directory.md` | Operator must decide whether this service should be presented as an A2A service and sign up if appropriate. | 2026-06-21 | Site advertises sign-up and Submit Agent. Do not claim A2A registry presence. |
| AgentRolodex | https://agentrolodex.com | A2A agent directory | P2 | `ready_to_submit` | Conditional | Unknown | Register A2A agent | Manual | Hosted agent card | Operator can review the register flow and submit only if service category fits. | 2026-06-21 | Agent card exists, but directory fit is lower priority than API/x402 channels. |
| a2alist.ai | https://a2alist.ai | A2A/x402 directory | P3 | `not_started` | Unknown | Unknown | Unknown | Manual research | Hosted agent card, x402 package | Research submission mechanism before taking action. | 2026-06-21 | Active directory surfaced in search, but submission path was not confirmed. |
| MadeWithStack | https://www.madewithstack.com/submit | Agent-native/developer product directory | P2 | `ready_to_submit` | Conditional | No account shown; badge commitment required | Manual review form | Manual | `distribution/submissions/developer-api-directory.md` | Operator must approve badge commitment before submitting. | 2026-06-14 | Good agent-native fit, but badge commitment makes this a human authorization step. |
| PublicAPIs.io | https://publicapis.io/submit | API directory | P3 | `not_applicable` | No | Payment required for pro path | Paid listing form | Manual | None | Skip for this wave. | N/A | Submission page emphasizes a paid $99 Pro listing; this pass does not create payments. |
| TheFreeAPI | https://thefreeapi.com | Free public API directory | P3 | `not_applicable` | No | Unknown | Add API form | Manual | None | Skip unless a free/no-auth public subset is launched. | N/A | InterAI is a paid/trial API, not a free public API. |
| Search/indexing/SEO | GitHub, hosted metadata, future backlinks | Discoverability | P0 | `prepared` | Yes | No | Metadata hygiene | Manual plus monitoring | README, release, hosted `.well-known` endpoints | Keep first wave small; monitor telemetry after each targeted submission. | 2026-06-10 | First wave should use `ai-risk-oracle.fly.dev`; do not wait for a custom domain. |
| Future domain path | `oracle.interailabs.com`, `api.interailabs.com` | Brand trust/canonical hosting | P1 | `blocked_needs_domain` | No | DNS/Fly/domain access | Infrastructure planning | Manual | `docs/domain-and-hosting-roadmap.md` | Keep Fly URL for first wave; plan `oracle.interailabs.com` after initial discovery. | 2026-06-21 | Reserve `api.interailabs.com` for future stable platform APIs. |

## Recommended GitHub Topics

Use only if an InterAI Labs maintainer confirms repository metadata updates:

```text
autonomous-agents
ai-agents
agent-safety
execution-gateway
pre-execution-verification
openapi
x402
base-usdc
trust-receipts
developer-api
```

## Post-Distribution Telemetry Review

After each targeted channel action, review telemetry at 24 hours and 48 hours.

Use the admin-only production summary:

```text
GET /admin/adoption/summary
```

Review these counters:

- `discovery_hits`
- `pricing_hits`
- `onboardings`
- `first_verifies`
- `total_verifies`
- `x402_payment_required`
- `topup_created`
- `topup_confirmed`
- `errors`

Compare the channel action timestamp with `last_24h` and `last_7d`. Do not
publish raw telemetry. Share external adoption numbers only after operator
review.

## Operating Rules

- Do not claim publication before it is verified.
- Do not submit external forms without operator approval.
- Do not create external accounts from this tracker.
- Do not paste API keys, admin tokens, payment secrets, or raw customer data into
  directory forms.
- Link to hosted metadata instead of copying changing operational values.
- Keep beta scope honest: controlled technical beta, not broad high-volume
  production service.
