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
IARO_GITHUB_TOKEN=YOUR_GITHUB_TOKEN
IARO_GITHUB_REPO=InterAILabs/ai-risk-oracle
PORT=8787
```

`IARO_ADMIN_TOKEN` is only used in memory for:

```text
GET /admin/adoption/summary
```

The dashboard sends it as `X-Admin-Token`. It is not written to disk, printed, or
returned by the local API.

`IARO_GITHUB_TOKEN` is optional. When present, the monitor uses it only for
read-only public GitHub API requests. It is not printed, stored, or returned by
the local API. Without it, the monitor still works with public GitHub requests,
cache, ETags, and rate-limit backoff.

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

Optional source fields supported by the hardened monitor:

- `ttl_seconds`: per-source polling TTL.
- `cache_strategy`: cache policy description, usually
  `memory_and_disk_stale_while_revalidate` for GitHub.
- `api_auth`: whether public API auth is optional.
- `rate_limit_sensitive`: whether rate-limit handling applies.
- `approval_rules`: what is required before claiming approved/listed.
- `no_claim_rules`: what must not be inferred.
- `manual_next_action`: safe operator next step.
- `success_criteria`: evidence needed to mark success.

For APIs.guru, an open issue means `submitted_pending_review`. A closed issue is
not automatically approved or listed. Listing should only be claimed when a
maintainer confirms it, the OpenAPI Directory repository includes the API, or
another explicit directory signal exists.

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

## Polling, Cache, And TTL

The dashboard uses short TTLs for InterAI production health and longer TTLs for
distribution checks:

- Public InterAI health and metadata: approximately 45 seconds.
- Admin telemetry: approximately 60 seconds.
- Local diagnostics: approximately 60 seconds.
- GitHub issue and release checks: 15 minutes by default.
- Manual and future registry channels: static config only unless an `api_url` is
  explicitly added.

GitHub checks use:

- `User-Agent: InterAI-Risk-Oracle-Monitor/0.1`
- optional `IARO_GITHUB_TOKEN`
- in-memory cache
- local disk cache
- ETag / `If-None-Match` when available
- rate-limit headers:
  - `x-ratelimit-limit`
  - `x-ratelimit-remaining`
  - `x-ratelimit-reset`

If GitHub returns a 403 rate limit response, the monitor preserves the last known
good state when available, marks the source as cached/stale, and waits for the
reset/backoff window before retrying. Rate limit does not change the real
distribution status.

The local cache is:

```text
.cache/iaro-monitor-cache.json
```

The root `.gitignore` excludes `.cache/`. The cache must never contain tokens.
It stores only public GitHub state, public health summaries, timestamps, rate
limit metadata, and aggregate telemetry snapshots.

To reset local monitor state:

```powershell
Remove-Item -LiteralPath .cache\iaro-monitor-cache.json
```

Then restart the dashboard.

Admin adoption telemetry shows aggregate counters for `last_24h`, `last_7d`,
and `all_time` when `IARO_ADMIN_TOKEN` is set. Without a token it shows:

```text
Admin telemetry unavailable: set IARO_ADMIN_TOKEN
```

When telemetry is unavailable, dashboard cells show `unavailable`. This is
different from real zero values. Numeric zero means the admin endpoint loaded and
reported no events for that metric. `unavailable` means no operator telemetry was
loaded.

The monitor identifies its own production requests with:

```text
User-Agent: InterAI-Risk-Oracle-Monitor/0.1
X-IARO-Monitor: local-dashboard
```

These headers are classification hints only. They are not used for auth or
security decisions.

If `/admin/adoption/summary` provides `traffic_segments`, the dashboard uses
`traffic_segments.<window>.external_only` for the main telemetry table, signal
interpretation, and telemetry deltas. Raw counters remain visible in the
Raw / mixed all traffic table. `adoption.windows` is still raw `all_traffic` for
compatibility.

Traffic segments:

- `all_traffic`: raw counters, including internal and historical traffic.
- `external_only`: public/external traffic after excluding local monitor, admin,
  demo trial, smoke/audit, and unknown historical records.
- `internal_monitoring`: local dashboard and admin-route traffic.
- `demo_trial`: controlled demo traffic from scoped trial keys. Treat it as demo
  funnel interest, not paid adoption.
- `smoke_or_audit`: self-serve smoke/audit activity.
- `unknown_or_historical`: older or incomplete records that cannot be safely
  classified.

Metrics from before traffic source classification are mixed/raw. Do not describe
pre-change counts as real adoption or real users unless the external-only segment
supports that claim.

Interpretation rules for `external_only` when available:

- `discovery_hits > 0`: discovery/indexing activity.
- `pricing_hits > 0`: commercial curiosity.
- `onboardings > 0`: trial adoption.
- `first_verifies > 0`: first real usage.
- `total_verifies > first_verifies`: repeated verify usage observed.
- `demo_trial_created > 0`: controlled demo trial creation.
- `demo_verify_completed > 0`: safe demo verification completed.
- `x402_payment_required > 0`: payment path touched, not necessarily buyer intent.
- `topup_created > 0`: payment intent.
- `topup_confirmed > 0`: confirmed revenue.
- `errors > 0`: investigate and classify.

If only raw/mixed telemetry is available, treat the same signals as cautious
operator hints, not external adoption proof.

The dashboard stores aggregate snapshots locally and shows deltas since the
previous snapshot, for example `pricing_hits: +3`. If no prior snapshot exists,
it reports `baseline created`.

## Error Triage

The dashboard uses backend-provided aggregate error classification when
available. If `/admin/adoption/summary` does not provide enough breakdown to
classify errors, the UI shows:

```text
Errors require log review
```

Classification categories are:

- `expected_auth_or_payment_errors`
- `invalid_requests`
- `monitor_or_admin`
- `real_server_errors`
- `unknown`

Rules:

- 402 `payment_required` is not automatically a severe error.
- 401/403 auth/admin failures may be expected.
- 4xx from invalid test requests may be expected.
- confirmed 5xx errors require attention.

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

GitHub checks are public GET requests and include:

```text
User-Agent: InterAI-Risk-Oracle-Monitor/0.1
```

If `IARO_GITHUB_TOKEN` is set, the monitor uses it only for GitHub API reads. If
GitHub rate limits local requests, the affected channel shows `RATE LIMITED` and
continues to show cached or configured state rather than turning the source into
a false failure.

### Missing Admin Token

To load admin telemetry, set `IARO_ADMIN_TOKEN` in the shell that starts the
dashboard. Do not write it into files or print it:

```powershell
$env:IARO_ADMIN_TOKEN = "<token value>"
npm run monitor:dashboard
```

Without the token, public health, pricing, OpenAPI, and distribution checks still
run.

## Overall Status

The UI reports:

- `green`: production health, readiness, OpenAPI, pricing, and cached
  distribution state are OK.
- `yellow`: production is OK but telemetry errors are unclassified, GitHub is
  rate-limited, or admin telemetry is unavailable.
- `red`: `/health`, `/ready`, OpenAPI, pricing, or confirmed server health checks
  fail.

With production OK, telemetry loaded, and aggregate errors still unclassified,
the expected operator posture is `yellow`.

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
