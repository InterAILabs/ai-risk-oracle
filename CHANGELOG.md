# Changelog

## v0.0.1-beta.1

This is the first public-beta release candidate for InterAI Risk Oracle as a
paid trust-verification layer for autonomous agents.

### Added

- x402-compatible payment negotiation for paid verification endpoints.
- MCP JSON-RPC bridge with discovery resources, prompts, and verification tools.
- A2A Agent Card and synchronous `message/send` verification endpoint.
- Signed trust receipts with public receipt lookup and signature verification.
- Prepaid Base USDC billing, top-ups, ledger, usage, and account summaries.
- Idempotent response replay for HTTP, batch, A2A, and MCP verification calls.
- Deterministic `fast_heuristic` and local `semantic_judge` verification modes.
- Production readiness checks through `/ready` and `npm run deploy:check`.
- Admin operational summaries protected by `X-Admin-Token`.
- Public benchmark suite with 60 trust-layer scenarios.
- Online production smoke check through `npm run smoke:online`.
- TypeScript SDK export and dependency-free Python client.

### Baseline

- Benchmark cases: 60
- Passed: 58
- Failed: 2
- Accuracy: 96.67%
- False positives: 1
- False negatives: 1

Known benchmark misses are intentionally visible and documented in
`docs/benchmark-baseline.md`.

### Limits

- The oracle estimates risk and issues receipts; it does not guarantee factual
  truth.
- `semantic_judge` is currently deterministic and local, not an external LLM or
  evidence-backed verifier.
- Critical medical, legal, financial, safety, or irreversible workflows still
  require human or domain-specific review.
