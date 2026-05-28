# Release Checklist

Use this before publishing the package, making the repository public, or cutting
a deployment intended for external integrators.

## 1. Local Safety

Confirm the working tree only contains intentional changes:

```bash
git status --short
```

Do not publish local secrets, databases, logs, or generated scratch files.

Must not be included:

- `.env`
- `data.db`, `data.db-shm`, `data.db-wal`
- `server.out.log`, `server.err.log`
- `node_modules`
- test databases or temp files

## 2. Required Checks

Run the product-facing checks:

```bash
npm run package:check
npm run secrets:check
npm run contracts
npm run typecheck:examples
npm run smoke:sdk
npm test
npm run deploy:check
```

What each check protects:

- `package:check`: validates the npm package contents before publish.
- `secrets:check`: scans tracked files for private keys, real tokens, and non-placeholder secret-like env assignments.
- `contracts`: validates SDK export, OpenAPI paths, schemas, pricing, and discovery bundle.
- `typecheck:examples`: validates package-style TypeScript SDK consumption.
- `smoke:sdk`: validates the SDK against a live in-process server.
- `test`: validates scoring, billing, idempotency, A2A, MCP, receipts, and core routes.
- `deploy:check`: validates production env safety flags and required onchain/signing config.

## 3. Public Contract Review

Inspect these files before release:

- `README.md`
- `docs/quickstart.md`
- `docs/api-reference.md`
- `package.json`
- `sdk/interai-risk-oracle.ts`

Check that examples use stable endpoints, bearer auth, and idempotency keys.

## 4. Environment Review

Production-safe defaults:

```env
PAYMENT_MODE=onchain
DEV_TOPUP_ENABLED=false
ALLOW_FAKE_TOPUP_CONFIRM=false
ONBOARDING_DEV_AUTO_CREDIT_ENABLED=false
```

Required for onchain top-ups:

```env
TOPUP_RECEIVE_ADDRESS=0x...
BASE_RPC_URL=https://...
```

Optional but recommended for signed trust receipts:

```env
ORACLE_SIGNING_SECRET=...
```

`npm run deploy:check` expects production-like environment variables and fails
if dev funding, fake top-up confirmation, or weak defaults are enabled.

## 5. Package Dry Run

`npm run package:check` already performs a dry run and validates required files.
If you want to inspect the raw npm output:

```bash
npm pack --dry-run
```

The package should include compiled `dist` files, docs, README, and
`package.json`. It should not include local databases, `.env`, logs, tests, or
`node_modules`.

## 6. Release Notes

For every release, summarize:

- SDK changes
- API contract changes
- pricing or billing changes
- trust receipt/schema changes
- migration notes for integrators

If any public response field changes, treat it as a contract change and update
OpenAPI, schemas, docs, examples, and contract checks together.
