# Manual Submit Tomorrow

Use this checklist on 2026-06-09. Submit only one channel at a time, then review
telemetry after 24 hours and 48 hours.

Do not claim InterAI is listed, approved, official, certified, audited, or
high-volume production-ready unless the channel explicitly confirms that status.

## 1. APIs.guru / OpenAPI Directory

First repair GitHub CLI, or use the browser while logged in as InterAI Labs.

Safe CLI repair options:

```text
gh auth status
gh auth login -h github.com -w -p https
gh auth refresh -h github.com -s repo
```

Do not paste a token manually unless the operator explicitly authorizes a PAT
flow. Do not print tokens.

Open:

```text
https://apis.guru/add-api/
```

Fields:

```text
URL: https://ai-risk-oracle.fly.dev/.well-known/openapi.json
Format: OpenAPI/Swagger
Is the definition official?: Yes, by API owner
API Name: InterAI Risk Oracle
API Logo URL: leave blank unless an approved square logo URL is available
Category: Artificial Intelligence
```

What happens:

```text
The form opens a GitHub issue in APIs-guru/openapi-directory.
```

Do not:

- submit from a personal account if InterAI Labs account/auth is expected;
- mark as listed until the issue is accepted and merged/indexed;
- edit the generated issue to add claims beyond the public OpenAPI metadata.

After submit:

- save the issue URL;
- set tracker status to `submitted` only after the GitHub issue is actually
  created;
- review telemetry after 24/48h.

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
- include request ID `10a30a3d-8631-4ca5-8340-c2315a848821` if contacting Arch
  Tools about the failed automated attempt;
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
- `x402_payment_required`
- `topup_created`
- `topup_confirmed`
- `errors`

Use only:

```text
GET /admin/adoption/summary
```

Do not publish raw telemetry without operator review.
