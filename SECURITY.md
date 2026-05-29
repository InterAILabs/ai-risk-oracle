# Security Policy

InterAI Risk Oracle is payment and trust infrastructure for autonomous agents.
Please treat security reports with care and avoid posting exploit details,
secrets, tokens, transaction replay material, or account identifiers in public
issues.

## Supported Versions

| Version | Supported |
| --- | --- |
| `0.0.1-beta.x` | Yes |
| earlier snapshots | No |

## Reporting A Vulnerability

Use GitHub private vulnerability reporting or Security Advisories for this
repository when available.

If private reporting is not available, open a minimal public issue asking for a
security contact path. Do not include exploit steps, API keys, private
transaction details, database files, or production secrets in that public issue.

Helpful private report details:

- affected endpoint, SDK, or protocol surface
- whether the issue affects bearer billing, x402, top-ups, receipts, admin
  endpoints, MCP, A2A, or discovery
- minimal reproduction steps without real secrets
- expected impact and whether funds, receipts, or account data can be affected
- suggested mitigation, if known

## Scope

In scope:

- authentication and authorization bypasses
- payment replay or double-spend acceptance
- idempotency replay bugs that create extra receipts or debits
- trust receipt signature bypasses
- account or admin data exposure
- secret leakage through logs, package contents, docs, or public responses
- MCP/A2A payload handling issues that can affect billing or trust decisions

Out of scope for security reporting:

- calibration disagreements in the risk model without a security impact
- benchmark false positives/false negatives already documented
- missing feature requests
- attacks requiring access to a user's local `.env`, database, or machine

## Production Safety

Production deployments should keep:

- `PAYMENT_MODE=onchain`
- `DEV_TOPUP_ENABLED=false`
- `ALLOW_FAKE_TOPUP_CONFIRM=false`
- `ONBOARDING_DEV_AUTO_CREDIT_ENABLED=false`
- long non-default `ADMIN_TOKEN`
- long `ORACLE_SIGNING_SECRET`
- HTTPS `BASE_RPC_URL`
- valid `TOPUP_RECEIVE_ADDRESS`

Run before deploy:

```bash
npm run secrets:check
npm run deploy:check
```
