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
GET /api/diagnostics
```

`/api/status` returns the full dashboard payload. `/api/distribution-sources`
returns the parsed channel configuration. `/api/diagnostics` returns safe local
runtime and outbound connectivity diagnostics.

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

When telemetry is unavailable, dashboard cells show `unavailable`. This is
different from real zero values. Numeric zero means the admin endpoint loaded and
reported no events for that metric. `unavailable` means no operator telemetry was
loaded.

## Troubleshooting

### All Endpoints Show Request Failures

Open the local diagnostics endpoint:

```text
http://127.0.0.1:8787/api/diagnostics
```

Check:

- `fetchAvailable`: whether the current Node runtime exposes `globalThis.fetch`
- `dns`: whether `ai-risk-oracle.fly.dev` and `api.github.com` resolve
- `outboundTests`: whether local GET requests to production health and GitHub API
  succeed
- `lastError`: the latest safe error details
- `conclusion`: the monitor's probable diagnosis

Possible conclusions:

- `ok`: outbound checks and required diagnostics are healthy.
- `local_outbound_failed`: both InterAI and GitHub checks failed, usually from
  local firewall, sandbox, proxy, DNS, or network policy.
- `github_api_failed`: production health worked but GitHub API failed.
- `production_down`: GitHub worked but InterAI production health failed.
- `admin_token_missing`: public checks worked, but admin telemetry is unavailable
  because `IARO_ADMIN_TOKEN` is not set.
- `unknown`: diagnostics were inconclusive.

The request wrapper exposes safe fields such as `errorType`, `errorCode`,
`causeCode`, `errorMessage`, `durationMs`, `status`, `ok`, `jsonParse`, and
`checkedAt`. Examples include `ENOTFOUND`, `ECONNRESET`, `ETIMEDOUT`,
`SELF_SIGNED_CERT_IN_CHAIN`, `fetch_not_available`, `request_timeout`,
`json_parse_failed`, and `http_error`.

### Proxy Or Firewall

The diagnostics endpoint reports only whether these variables are present, not
their values:

```text
HTTP_PROXY
HTTPS_PROXY
NO_PROXY
```

If outbound fails locally but the same URLs work in a browser, check corporate
proxy requirements, VPN policy, Windows firewall, endpoint security software, or
the shell/sandbox where Node is running.

### Node Version And Fetch

The monitor prefers `globalThis.fetch`. If `fetch` is unavailable, it falls back
to native `http` and `https` modules. Use a recent Node version for the cleanest
behavior:

```bash
node -v
```

### GitHub API Rate Limits

GitHub checks are public unauthenticated GET requests and include:

```text
User-Agent: InterAI-Risk-Oracle-Monitor/0.1
```

The monitor does not use a GitHub token. If GitHub rate limits local requests,
the affected channel will show HTTP status and `http_error` details.

### Missing Admin Token

To load admin telemetry, set `IARO_ADMIN_TOKEN` in the shell that starts the
dashboard. Do not write it into files or print it:

```powershell
$env:IARO_ADMIN_TOKEN = "<token value>"
npm run monitor:dashboard
```

Without the token, public health, pricing, OpenAPI, and distribution checks still
run.

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
