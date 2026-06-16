# Local Monitoring Dashboard

This document describes the local-only monitoring dashboard for InterAI Risk
Oracle distribution and adoption checks.

## Run

From the private workspace root:

```bash
npm run monitor:dashboard
```

Then open:

```text
http://localhost:8787
```

The server binds only to `127.0.0.1`. It is not deployed and does not create any
public production endpoint.

## Environment

Optional environment variables:

```bash
IARO_BASE_URL=https://ai-risk-oracle.fly.dev
IARO_ADMIN_TOKEN=YOUR_ADMIN_TOKEN
IARO_GITHUB_REPO=InterAILabs/ai-risk-oracle
PORT=8787
```

`IARO_ADMIN_TOKEN` is only used in memory for:

```text
GET /admin/adoption/summary
```

The dashboard sends it as `X-Admin-Token`. It is not written to disk, printed, or
returned by the local API.

## Local API

The dashboard exposes local-only helper endpoints:

```text
GET /api/status
GET /api/distribution-sources
```

`/api/status` returns the full dashboard payload. `/api/distribution-sources`
returns the parsed channel configuration.

## Distribution Sources

Channels are configured in:

```text
public-clean/distribution/monitoring-sources.json
```

To add a channel, append one object to the JSON array. The monitor dispatches by
`type`, so common metadata should stay stable:

```json
{
  "id": "example-channel",
  "name": "Example Channel",
  "type": "manual_or_form",
  "priority": 9,
  "status": "ready_manual_review",
  "url": "https://example.com",
  "api_url": null,
  "submission_url": "https://example.com/submit",
  "requires_manual_action": true,
  "blocked_reason": null,
  "expected_signal": "A human operator confirms the listing outcome.",
  "interpretation_rules": {
    "ready_manual_review": "Manual review required."
  },
  "notes": [
    "No automated submission is allowed."
  ]
}
```

Supported active types:

- `github_issue`: checks a public GitHub issue API URL. `open` means
  `submitted_pending_review`; `closed` means `needs_manual_review` unless an
  explicit approval or listing confirmation exists.
- `github_release`: checks a public GitHub release API URL.
- `manual_or_form`, `unclear_path`, `future_registry`: no submission is
  attempted; the dashboard only shows configured status and next action.

## What It Checks

Public health checks:

```text
/
/health
/ready
/pricing
/openapi.json
/.well-known/openapi.json
/.well-known/ai-service.json
/.well-known/discovery-bundle.json
/.well-known/agent.json
/.well-known/autonomous-adoption.json
/autonomous-adoption.json
```

The dashboard records HTTP status, OK/fail, JSON parse status where applicable,
a short note, and last check timestamp.

OpenAPI shows parse status, OpenAPI version, info version, and the direct link.

Pricing shows current verify price, microusdc amount, currency, network, x402
availability, trial availability, and top-up availability.

Admin adoption telemetry shows aggregate counters for `last_24h`, `last_7d`,
and `all_time` when `IARO_ADMIN_TOKEN` is set. Without a token it shows:

```text
Admin telemetry unavailable: set IARO_ADMIN_TOKEN
```

## Signal Interpretation

The dashboard maps aggregate telemetry to operator-facing signals:

- `discovery_hits > 0`: Discovery/indexing activity
- `pricing_hits > 0`: Commercial curiosity
- `onboardings > 0`: Trial adoption
- `first_verifies > 0`: First real usage
- `total_verifies > first_verifies`: Repeated usage
- `x402_payment_required > 0`: Payment path touched
- `topup_created > 0`: Payment intent
- `topup_confirmed > 0`: Confirmed revenue
- `errors > 0`: Investigate logs

## What It Does Not Do

This dashboard does not:

- deploy to Fly
- modify production
- modify the database
- modify billing, x402 runtime, pricing runtime, wallet, or scoring
- read or write secrets files
- print admin tokens
- create public production endpoints
- expose admin data publicly
- make payments
- create external accounts
- send submissions
- bypass captcha or terms gates

It is a local operator dashboard. It does not replace real observability,
alerting, logging, tracing, or production incident tooling.
