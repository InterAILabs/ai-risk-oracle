# Contributing

InterAI Risk Oracle is in public beta. Contributions are welcome when they make
the trust layer safer, clearer, easier to integrate, or easier to operate.

## Project Direction

The project should remain a paid trust-verification layer for autonomous
agents. Prefer work that improves:

- deterministic risk signals
- signed trust receipts
- idempotent billing and response replay
- Base USDC/x402 payment safety
- MCP/A2A/HTTP discovery and integration
- SDK ergonomics
- benchmark transparency
- production readiness

Avoid changes that promise guaranteed truth, weaken payment safety, expose
secrets, or introduce mandatory external LLM dependencies.

## Local Setup

```bash
npm ci
npm run build
npm test
```

Useful checks:

```bash
npm run contracts
npm run benchmark
npm run secrets:check
npm run package:check
```

If Python is installed, also run:

```bash
npm run python:sdk
```

## Pull Request Expectations

Before opening a PR:

- keep the change focused
- update README/docs/examples when public behavior changes
- update OpenAPI, schemas, and contract checks for response or endpoint changes
- add or update tests for billing, idempotency, receipts, or protocol behavior
- run `npm run secrets:check`
- avoid committing `.env`, databases, logs, zips, generated temp files, or real
  API keys

## Benchmark Changes

Do not tune the benchmark by hiding failures. If a case exposes a calibration
gap, prefer documenting the false positive/false negative and improving the
signal logic separately.

## Security

Do not report vulnerabilities through normal PR comments or public issues with
exploit details. Follow [SECURITY.md](SECURITY.md).
