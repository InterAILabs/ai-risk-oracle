# Distribution Pack

Use this copy for controlled public beta distribution. Point people to the live
demo first, then to OpenAPI, pricing, and the public repository.

## One-Liner

InterAI Risk Oracle is a pre-execution verification API for autonomous agents.

## Short Description

InterAI Risk Oracle lets autonomous agents verify proposed actions before they
execute tools, payments, or other consequential steps. The API returns risk,
policy guidance, and a trust receipt that downstream systems can store for
audit. A controlled demo trial shows the flow with a safe read-only action.

## Long Description

InterAI Risk Oracle is a hosted verification layer for autonomous agents,
wallet agents, workflow engines, and policy systems. Before an agent executes a
tool call, payment, wallet signature, database update, workflow approval, trade,
or outbound action, it can call `/verify` to receive `recommended_action`,
`policy_result`, `risk_level`, signals, and trust receipt metadata.

The current beta is focused on measurable integration and safety boundaries:
discover the service, create a limited `demo_trial` key, run one safe read-only
verification, view the public trust receipt, then decide whether to integrate
normal `/verify` traffic through prepaid API keys or x402/Base USDC payment
metadata.

## Canonical Links

- Demo CTA: https://ai-risk-oracle.fly.dev/demo
- OpenAPI: https://ai-risk-oracle.fly.dev/.well-known/openapi.json
- Pricing: https://ai-risk-oracle.fly.dev/pricing
- Service discovery: https://ai-risk-oracle.fly.dev/.well-known/ai-service.json
- Discovery bundle: https://ai-risk-oracle.fly.dev/.well-known/discovery-bundle.json
- GitHub: https://github.com/InterAILabs/ai-risk-oracle
- Release: https://github.com/InterAILabs/ai-risk-oracle/releases/tag/v0.1.1-beta

## Curl Mini-Demo

Create a limited demo-trial key:

```bash
curl -sS -X POST https://ai-risk-oracle.fly.dev/onboard \
  -H "Content-Type: application/json" \
  -d '{"scope":"demo_trial","name":"demo_trial_builder","api_key_name":"demo_trial_key"}'
```

Run a safe read-only verification:

```bash
curl -sS -X POST https://ai-risk-oracle.fly.dev/verify \
  -H "Authorization: Bearer DEMO_TRIAL_API_KEY" \
  -H "Content-Type: application/json" \
  -H "X-Idempotency-Key: demo-safe-1" \
  -d '{"use_case":"agent-before-tool-execution","action":{"type":"read_only_lookup","name":"check_order_status","description":"Read a demo order status in a sandbox","external_side_effect":false,"irreversible":false},"context":{"agent_id":"agent_demo_safe","environment":"sandbox","user_confirmation":true},"policy":{"max_risk_level":"medium","require_trust_receipt":true,"require_human_review_above":0.75}}'
```

View the returned trust receipt:

```bash
curl -sS https://ai-risk-oracle.fly.dev/trust/receipts/RECEIPT_ID_FROM_VERIFY
```

## Expected Demo Signals

The safe demo path should return:

```json
{
  "recommended_action": "allow",
  "policy_result": "allow",
  "risk_level": "low",
  "trust_receipt_id": "tr_..."
}
```

The receipt lookup should return an `ok: true` response with a public `receipt`
object containing receipt ID, request contract, risk level, recommended action,
policy result, trust receipt ID, and safe public signals.

## Safety Boundaries

- Trial keys are limited, short-lived, and rate limited.
- Demo traffic does not move funds.
- Demo traffic does not confirm topups.
- Demo traffic does not execute external tools.
- Demo traffic does not fetch arbitrary URLs.
- Demo traffic does not bypass payment for non-trial traffic.
- Receipt lookup exposes safe public receipt fields.

## Suggested Categories And Tags

- autonomous agents
- agent security
- AI safety
- OpenAPI
- x402
- Base USDC
- pre-execution verification
- trust receipts
- policy enforcement

## Manual Submission Copy

Title:

```text
InterAI Risk Oracle
```

Description:

```text
InterAI Risk Oracle is a pre-execution verification API for autonomous agents.
Agents call /verify before executing tools, payments, wallet actions, or other
consequential steps. The API returns recommended_action, policy_result,
risk_level, signals, and trust receipt metadata so downstream systems can allow,
route for review, block, and store evidence for audit.
```

URL:

```text
https://ai-risk-oracle.fly.dev/demo
```

Category:

```text
Developer API / Agent Security / AI Infrastructure
```

Notes:

```text
Public beta. Demo trial is limited and read-only. No funds are moved, no topups
are confirmed, no external tools are executed, and no arbitrary URLs are
fetched. OpenAPI: https://ai-risk-oracle.fly.dev/.well-known/openapi.json.
Pricing: https://ai-risk-oracle.fly.dev/pricing.
```
