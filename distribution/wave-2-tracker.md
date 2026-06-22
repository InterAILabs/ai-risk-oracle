# Wave 2 Channel Tracker

Closed tracker for the current distribution sprint. Do not add new channels
unless there is an official, low-effort path with clear relevance to
pre-execution verification, OpenAPI, x402, or agent safety.

## Status Summary

| Channel | Status | Next Action | Automation Rule |
|---|---|---|---|
| APIs.guru | `submitted_pending_review` | Monitor issue #2665. | No duplicate submission. |
| x402.solutions | `manual_review_required` | Operator reviews consent and submits manually. | Do not submit automatically. |
| Arch Tools x402 Directory | `failed_retry_manual` | Manual retry or contact with prior request IDs. | Stop if HTTP 500 repeats. |
| FindAPI | `blocked_captcha_turnstile/manual` | Human-only form if still worth it. | Do not bypass captcha. |
| x402.eco | `blocked_unclear_submission_path` | Wait for clear official contribution path. | One search done; no auto-submit. |
| GitHub public repo | `ready_demo_first` | Keep README demo CTA and topics aligned. | No fake claims. |
| Manual technical post | `ready_manual_post` | Operator posts one channel at a time. | Do not publish automatically. |

## 1. APIs.guru

- URL: https://github.com/APIs-guru/openapi-directory/issues/2665
- Status: `submitted_pending_review`
- Verified on 2026-06-22: issue is open, no comments, no maintainer decision.
- Rules:
  - no spam;
  - only check issue state;
  - mark approved/listed only with explicit maintainer or directory evidence.

## 2. x402.solutions

- URL: https://www.x402.solutions/
- Status: `manual_review_required`
- Prepared copy: use [docs/distribution-pack.md](../docs/distribution-pack.md).
- Rules:
  - no submit without operator consent;
  - operator must accept review/feature terms manually.

## 3. Arch Tools x402 Directory

- URL: https://archtools.dev/directory
- Status: `failed_retry_manual`
- Previous request IDs:
  - `c65acb6c-c60c-4067-a7dc-e339f588c3b8`
  - `10a30a3d-8631-4ca5-8340-c2315a848821`
- Retry/contact note:

```text
InterAI Risk Oracle previously attempted a controlled x402 directory submission
and received HTTP 500 responses. Request IDs:
c65acb6c-c60c-4067-a7dc-e339f588c3b8 and
10a30a3d-8631-4ca5-8340-c2315a848821.

Service: InterAI Risk Oracle
Demo: https://ai-risk-oracle.fly.dev/demo
Pricing: https://ai-risk-oracle.fly.dev/pricing
OpenAPI: https://ai-risk-oracle.fly.dev/.well-known/openapi.json
```

- Rules:
  - no auto-submit if it fails again;
  - record confirmation before marking submitted.

## 4. FindAPI

- URL: https://www.findapi.dev/submit
- Status: `blocked_captcha_turnstile/manual`
- Prepared copy: use [docs/distribution-pack.md](../docs/distribution-pack.md).
- Rules:
  - no captcha bypass;
  - no automated form submission;
  - manual operator action only.

## 5. x402.eco

- URL: https://www.x402.eco
- Status: `blocked_unclear_submission_path`
- 2026-06-22 check: one search for an official submit/contribute path did not
  confirm a clear service-listing route.
- Rules:
  - do not submit until there is a documented official path;
  - mark blocked until contribution format or maintainer contact is clear.

## 6. GitHub Public Repo

- URL: https://github.com/InterAILabs/ai-risk-oracle
- Status: `ready_demo_first`
- Verified on 2026-06-22:
  - release `v0.1.1-beta` exists;
  - topics include `agent-safety`, `autonomous-agents`, `x402`,
    `base-usdc`, `openapi`, `trust-receipts`,
    `pre-execution-verification`, and `policy-enforcement`.
- Rules:
  - README must point visibly to `/demo`;
  - no APIs.guru approval/listing claims;
  - no enterprise-ready claims.

## 7. Manual Technical Post

- Status: `ready_manual_post`
- Title:

```text
Run a safe pre-execution verification in 3 curl commands
```

- Copy source: [distribution/manual-posts.md](manual-posts.md).
- Rules:
  - no automatic publishing;
  - post one channel at a time;
  - review dashboard after 24h and 48h.

## Dashboard Metrics To Watch

- `demo_started`
- `demo_trial_created`
- `demo_verify_completed`
- `demo_receipt_viewed`
- `topup_created`
- `topup_confirmed`
- `real_server_errors`
- `unknown`
