# Manual Submit Next

Use this checklist for the next manual distribution pass. Submit only one channel at a time, then review
telemetry after 24 hours and 48 hours.

Do not claim InterAI is listed, approved, certified, audited, officially
endorsed by a directory, or high-volume production-ready unless the channel
explicitly confirms that status.

## 1. APIs.guru / OpenAPI Directory

Status:

```text
submitted_pending_review
```

Issue:

```text
https://github.com/APIs-guru/openapi-directory/issues/2665
```

Do not submit another APIs.guru issue unless maintainers ask for a replacement.

Current details:

```text
Format: OpenAPI/Swagger
Official: true
API Name: InterAI Risk Oracle
Category: tools
OpenAPI URL: https://ai-risk-oracle.fly.dev/.well-known/openapi.json
```

Do not:

- claim InterAI is approved;
- claim InterAI is listed;
- claim APIs.guru acceptance until a maintainer or the directory confirms it.

Next action:

```text
Monitor issue #2665 and respond if maintainers request changes.
```

## 2. Arch Tools x402 Service Directory

Open:

```text
https://archtools.dev/directory
```

Fields:

```text
Service Name: InterAI Risk Oracle
URL: https://ai-risk-oracle.fly.dev
Description: x402-compatible Autonomous Execution Gateway for pre-execution verification of autonomous agents. Agents can discover pricing, onboard with API key/trial or x402, call /verify before consequential actions, and store trust receipts.
Contact Email: interailabs@gmail.com
```

If the form fails:

- record the HTTP/status message or visible error;
- include request ID `c65acb6c-c60c-4067-a7dc-e339f588c3b8` if contacting Arch
  Tools about the first failed automated attempt;
- include request ID `10a30a3d-8631-4ca5-8340-c2315a848821` if contacting Arch
  Tools about the second failed automated attempt;
- do not mark as submitted without confirmation.

## 3. x402.solutions

Open:

```text
https://www.x402.solutions/
```

Use:

```text
Project Name: InterAI Risk Oracle
Project Description: InterAI Risk Oracle is an x402-compatible Autonomous Execution Gateway for pre-execution verification of autonomous agents. Agents can discover pricing, onboard with API key/trial or x402, call /verify before consequential actions, and store trust receipts.
Website URL: https://ai-risk-oracle.fly.dev
Category: Other
Team Size: Solo Developer or operator-approved team size
Contact Name: InterAI Labs
Contact Email: interailabs@gmail.com
Additional Information: OpenAPI: https://ai-risk-oracle.fly.dev/.well-known/openapi.json; Pricing: https://ai-risk-oracle.fly.dev/pricing; Autonomous adoption: https://ai-risk-oracle.fly.dev/.well-known/autonomous-adoption.json
```

Do not submit unless the operator accepts:

```text
Submitted projects may be reviewed and potentially featured on the ecosystem page.
```

## 4. FindAPI

Open:

```text
https://www.findapi.dev/submit
```

Fields:

```text
API name: InterAI Risk Oracle API
Website URL: https://ai-risk-oracle.fly.dev
Description: Pre-execution verification API for autonomous agents. InterAI returns score, risk_level, signals, recommended_action, policy_result, and trust receipt metadata before consequential action execution.
Use cases:
Verify an autonomous agent action before tool execution
Gate wallet/payment actions before release
Route risky actions to policy review
Store trust receipts for audit
Auth type: API Key
CORS: No, unless operator verifies otherwise
Protocol: HTTPS
Pricing: Free + Paid
Free note: Controlled technical beta includes trial metadata where available; current details are published at /pricing.
```

Do not:

- bypass Turnstile;
- automate captcha;
- claim listing before confirmation.

## Telemetry Review

After each successful manual submission, review at 24 hours and 48 hours:

- `discovery_hits`
- `pricing_hits`
- `onboardings`
- `first_verifies`
- `total_verifies`
- `receipts_created`
- `x402_payment_required`
- `topup_created`
- `topup_confirmed`
- `errors`

Use only:

```text
GET /admin/adoption/summary
```

Do not publish raw telemetry without operator review.
