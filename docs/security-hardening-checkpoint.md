# Security hardening checkpoint — 2026-09-15

Status: work in progress, not released. Saved for continuation at the user's
request. Do not merge or deploy until the remaining validation is complete.

## Implemented

- Owner-authenticated full receipt lookup; anonymous ID/time-only reference.
- Independent IP budget, verified-account verify budget, bounded rate-limit maps.
- CrewAI v2 receipt ID and nested host-context corrections, signed grant binding.
- TypeScript verified-receipt consumption helper and persistent SQLite executor example.
- SDK verification requests include the structured receipt with opaque signed bytes.

## Validation at this checkpoint

- Core TypeScript build passed during implementation; rerun on the final commit.
- Public TypeScript SDK build passed.
- Core `node tests/receipt-privacy-rate-limit.mjs`: passed.
- Public `node --test tests/execution-boundary.test.mjs`: passed (binding,
  concurrent consumption, restart, store failure, frozen dispatch arguments).
- Modified Python files parse successfully. CrewAI framework tests NOT run:
  the current Python environment does not contain `crewai`.
- Full regression suite, final contract checks and production checks NOT run.

## Continue in this order

1. Add CrewAI tests using real v2 receipt/context shapes, including signature
   rejection and signed-authorization mismatch; run the existing framework suite
   against its documented dependency version. Validate TTL across HTTP verification
   and consumption; the CrewAI example still uses process-local replay storage.
2. Complete the privacy migration: sync published JSON schemas and discovery
   OpenAPI, public/core docs and affected consumers; test authenticated full,
   anonymous summary, expired/revoked keys, legacy receipts and accountless x402
   evidence retention. Review public summary SDK typing. Ensure authenticated
   signed payloads remain byte-for-byte verifiable.
3. Run full core build/test/contracts/package/secrets/Python checks plus public
   SDK and integration checks. Review rate-limit behavior under test volume and
   Fly ingress. Review diffs, then merge/push main in each repo and wait for
   deployment CI plus read-only health/contract smoke checks.

Do not publish package releases automatically; repository changes are not an npm
or PyPI release. No credentials, runtime databases or private implementation
should be copied into the public repository.
