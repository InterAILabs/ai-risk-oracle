# Release Checklist

Use this before publishing the package, making the repository public, cutting a
GitHub release, or deploying a version intended for external agents.

## 1. Local Safety

Confirm the working tree only contains intentional changes:

```bash
git status --short
```

Never publish local secrets or generated runtime files:

- `.env`
- `data.db`, `data.db-shm`, `data.db-wal`
- `server.out.log`, `server.err.log`
- `*.log`
- `*.zip`
- `node_modules`
- local test databases or temp files

Run:

```bash
npm run secrets:check
```

If a sensitive file is tracked by mistake, remove it from tracking without
deleting it locally:

```bash
git rm --cached <file>
```

## 2. Required Local Commands

Run these before every release candidate:

```bash
npm ci
npm run build
npm test
npm run contracts
npm run benchmark
npm run secrets:check
npm run python:sdk
npm run package:check
npm run deploy:check
npm run smoke:idempotency
npm run smoke:trust-signing
npm run smoke:sdk
```

What the checks protect:

- `build`: TypeScript server and SDK output.
- `test`: scoring, billing, idempotency, readiness, admin, A2A, MCP, receipts, and core routes.
- `contracts`: SDK export, OpenAPI paths, schemas, pricing, and discovery bundle.
- `benchmark`: public calibration report across trust-layer scenarios.
- `secrets:check`: tracked-file secret scan.
- `python:sdk`: dependency-free Python example syntax when Python is available.
- `package:check`: npm package dry-run and unsafe file exclusion.
- `deploy:check`: production env safety flags and required onchain/signing config.
- `smoke:idempotency`: replay semantics and receipt stability.
- `smoke:trust-signing`: receipt signing and verification behavior.
- `smoke:sdk`: SDK behavior against an in-process server.

If the release candidate has already been deployed to a public environment, run:

```bash
npm run smoke:online
```

Set `BASE_URL=https://your-deployment.example` to check a non-default
deployment. This validates health, readiness, pricing, discovery, schemas,
x402 payment negotiation, MCP initialize/tools, and A2A payment-required
behavior without creating accounts or consuming balance.

## 3. Production Manual Checks

After deploy, manually check the live service:

- `npm run smoke:online` passes against the deployed `BASE_URL`
- `POST /verify` with bearer auth and no balance returns `insufficient_balance`
- `POST /topup/create`
- `POST /topup/confirm` with a real transaction or test environment
- replaying the same top-up transaction fails
- public receipt lookup via `GET /trust/receipts/:receiptId`

## 4. Environment Review

Production-safe values:

```env
PAYMENT_MODE=onchain
DEV_TOPUP_ENABLED=false
ALLOW_FAKE_TOPUP_CONFIRM=false
ONBOARDING_DEV_AUTO_CREDIT_ENABLED=false
ONBOARDING_TRIAL_CREDIT_ENABLED=false
BODY_LIMIT_BYTES=32000
REQUEST_TIMEOUT_MS=6000
RL_CAPACITY=120
RL_REFILL_PER_SEC=2
```

Required:

```env
TOPUP_RECEIVE_ADDRESS=0x...
BASE_RPC_URL=https://...
ADMIN_TOKEN=...
ORACLE_SIGNING_SECRET=...
```

Use a long, non-default `ADMIN_TOKEN` and a long `ORACLE_SIGNING_SECRET`.

## 5. Public Contract Review

Inspect these files before release:

- `README.md`
- `docs/quickstart.md`
- `docs/api-reference.md`
- `docs/release-checklist.md`
- `package.json`
- `sdk/interai-risk-oracle.ts`
- `src/routes/openapi.ts`
- `src/routes/schemas.ts`

Check that examples use stable endpoints, bearer auth, and idempotency keys.

## 6. Release Notes

For every release, summarize:

- SDK changes
- API contract changes
- pricing or billing changes
- trust receipt/schema changes
- production config changes
- migration notes for integrators

If any public response field changes, treat it as a contract change and update
OpenAPI, schemas, docs, examples, and contract checks together.
