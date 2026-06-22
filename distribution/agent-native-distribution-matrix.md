# Agent-Native Distribution Matrix

Status date: 2026-06-22

This matrix tracks discovery channels for InterAI Risk Oracle without claiming
approval, listing, or external publication unless there is explicit evidence.

| Channel | Current status | Evidence | URL | Next action | Manual required | Success criteria | Metric to watch | Risk | Priority |
|---|---|---|---|---|---|---|---|---|---|
| APIs.guru | `submitted_pending_review` | GitHub issue #2665 is the tracked submission; no approval/listing claim. | https://github.com/APIs-guru/openapi-directory/issues/2665 | Monitor issue only; do not duplicate-submit. | yes | Maintainer comment, merge, or directory entry confirms listing. | discovery.openapi.view | Misstating pending review as approved. | high |
| Other OpenAPI catalogs | `research_manual_only` | No verified official low-risk submission path recorded. | n/a | Research one catalog at a time and record official path before action. | yes | Official form or contribution flow accepts hosted OpenAPI. | discovery.openapi.view | Spammy or duplicate submissions. | medium |
| x402.solutions | `manual_required` | Wave 2 tracker marks operator review/consent required. | https://www.x402.solutions/ | Operator reviews terms and submits manually if appropriate. | yes | Confirmation page, email, or listing URL. | x402_payment_required | Consent or listing-criteria mismatch. | high |
| Arch Tools x402 Directory | `failed_retry_manual` | Prior attempts returned HTTP 500 with recorded request IDs. | https://archtools.dev/directory | Manual retry or contact with request IDs; stop if 500 repeats. | yes | Successful submission confirmation or maintainer response. | x402_payment_required | Repeated failed submissions/noisy retries. | medium |
| x402.eco | `unclear_path_manual` | No clear official service listing path confirmed. | https://www.x402.eco | Wait for official contribution/submission route. | yes | Documented path or maintainer confirmation. | x402_payment_required | Guessing a non-existent flow. | low |
| robots.txt | `implemented_local` | Route serves crawler policy and sitemap URL after this change. | https://ai-risk-oracle.fly.dev/robots.txt | Deploy after validation. | no | 200 text/plain in production. | discovery.bundle.view | Blocking useful routes by accident. | high |
| sitemap.xml | `implemented_local` | Route lists public discovery, demo, pricing, OpenAPI, and manifests. | https://ai-risk-oracle.fly.dev/sitemap.xml | Deploy after validation. | no | 200 application/xml in production and parseable XML. | discovery.bundle.view | Stale lastmod if generated incorrectly. | high |
| llms.txt | `implemented_local` | Route summarizes demo, pricing, OpenAPI, manifests, and safety limits. | https://ai-risk-oracle.fly.dev/llms.txt | Deploy after validation. | no | 200 text/plain in production. | demo_started | Over-claiming capabilities. | high |
| .well-known manifests | `live_needs_demo_alignment` | ai-service, discovery bundle, agent card, autonomous adoption are live JSON. | https://ai-risk-oracle.fly.dev/.well-known/ai-service.json | Deploy demo links and web discovery links. | no | Manifests mention `/demo`, `/pricing`, OpenAPI, receipts, and no approval claims. | discovery.ai_service.view | Metadata drift from live routes. | high |
| GitHub README | `ready_demo_first` | README points visibly to hosted `/demo`. | https://github.com/InterAILabs/ai-risk-oracle | Keep demo-first copy aligned. | no | README first evaluation path remains `/demo`. | demo_started | Public docs drifting from private source. | high |
| GitHub release | `documented_public_beta` | Distribution pack references `v0.1.1-beta`; no new release approved here. | https://github.com/InterAILabs/ai-risk-oracle/releases/tag/v0.1.1-beta | Do not create a new release without explicit approval. | yes | Release notes match current hosted surfaces. | demo_trial_created | Publishing stale claims. | medium |
| GitHub topics | `verify_manually` | Wave 2 tracker records topic set; GitHub API was not authoritative in this run. | https://github.com/InterAILabs/ai-risk-oracle | Verify manually before changing topics. | yes | Topics reflect agent safety, OpenAPI, x402, Base USDC, trust receipts. | demo_started | Topic churn or unverified repo metadata. | medium |
| MCP server package | `future_integration` | Hosted MCP bridge metadata exists; standalone MCP server package is not claimed. | n/a | Design real MCP server package and publish plan. | yes | Installable MCP server with documented tools/resources. | mcp_tool_discovery_bundle | Confusing hosted bridge with package distribution. | medium |
| A2A | `hosted_surface_live` | A2A endpoint and agent card are live discovery surfaces. | https://ai-risk-oracle.fly.dev/.well-known/agent.json | Add more examples and conformance notes later. | no | Agent card stays valid and examples run. | discovery.agent_card.view | Experimental protocol drift. | medium |
| TypeScript SDK | `future_hardening` | SDK export exists, but distribution-level SDK polish is future work. | https://github.com/InterAILabs/ai-risk-oracle | Add package examples and consumer checks before broader promotion. | yes | SDK package check and example agent pass in CI. | demo_verify_completed | Premature SDK distribution claims. | medium |
| Python SDK | `future_hardening` | Minimal Python client exists in repo. | https://github.com/InterAILabs/ai-risk-oracle | Add install docs, examples, and smoke checks before broader promotion. | yes | Python smoke passes against demo-safe flow. | demo_verify_completed | Unsupported package expectations. | low |
| Agent framework examples | `future_integration` | Examples exist for basic agent, MCP, A2A, x402, and pre-tool flows. | https://github.com/InterAILabs/ai-risk-oracle/tree/main/examples | Curate examples after main/source-of-truth branch is reconciled. | yes | One copy-pasteable example per target framework. | demo_receipt_viewed | Framework-specific maintenance load. | medium |

## Dashboard Metrics

Watch these for 48 hours after deploy or manual distribution:

- `demo_started`
- `demo_trial_created`
- `demo_verify_completed`
- `demo_receipt_viewed`
- `topup_created`
- `topup_confirmed`
- `real_server_errors`
- `unknown`

