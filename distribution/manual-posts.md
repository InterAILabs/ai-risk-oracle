# Manual Posts

Use these manually. Do not publish automatically. Point all traffic to the demo
first so the funnel can measure `demo_trial_created`, `demo_verify_completed`,
and `demo_receipt_viewed`.

## 1. Short X/LinkedIn Post

```text
InterAI Risk Oracle is in controlled public beta: a pre-execution verification
API for autonomous agents.

The simple path is now live:
1. create a limited demo_trial key
2. verify one safe read-only sandbox action
3. view the trust receipt

The demo does not move funds, confirm topups, execute external tools, fetch
arbitrary URLs, or bypass payment for non-trial traffic.

Try it here: https://ai-risk-oracle.fly.dev/demo

OpenAPI: https://ai-risk-oracle.fly.dev/.well-known/openapi.json
Pricing: https://ai-risk-oracle.fly.dev/pricing
```

## 2. Technical Post

```text
Run a safe pre-execution verification in 3 curl commands

InterAI Risk Oracle is a pre-execution verification API for autonomous agents.
The idea is simple: before an agent executes a tool call, payment, wallet action,
or other consequential step, call /verify and get a policy decision plus a trust
receipt.

The controlled demo is designed to be safe and measurable. It creates a limited
demo_trial key, runs one read-only sandbox verification, and returns a public
trust receipt you can inspect.

1. Create a demo trial key:

curl -sS -X POST https://ai-risk-oracle.fly.dev/onboard \
  -H "Content-Type: application/json" \
  -d '{"scope":"demo_trial","name":"demo_trial_builder","api_key_name":"demo_trial_key"}'

2. Use the returned key to verify the safe read-only action shown on:

https://ai-risk-oracle.fly.dev/demo

3. Open the returned receipt:

curl -sS https://ai-risk-oracle.fly.dev/trust/receipts/RECEIPT_ID_FROM_VERIFY

Expected safe path fields include recommended_action=allow,
policy_result=allow, risk_level=low, and trust_receipt_id.

The demo does not move funds, confirm topups, execute external tools, fetch
arbitrary URLs, or bypass payment for non-trial traffic. It is intentionally a
small beta path for agent builders who want to test the verification contract.

Demo: https://ai-risk-oracle.fly.dev/demo
OpenAPI: https://ai-risk-oracle.fly.dev/.well-known/openapi.json
Pricing: https://ai-risk-oracle.fly.dev/pricing
```

## 3. Forum/HN Style

```text
I am working on InterAI Risk Oracle, a pre-execution verification API for
autonomous agents.

The service is meant for systems that need a checkpoint before an agent executes
a tool call, payment, wallet action, or other consequential step. The /verify
response includes risk_level, recommended_action, policy_result, signals, and a
trust receipt ID that can be stored for audit.

There is now a controlled demo path:

- create a limited demo_trial key
- run a safe read-only sandbox verification
- view the returned trust receipt

The demo is intentionally narrow. It does not move funds, confirm topups,
execute external tools, fetch arbitrary URLs, or bypass payment for non-trial
traffic.

Demo: https://ai-risk-oracle.fly.dev/demo
OpenAPI: https://ai-risk-oracle.fly.dev/.well-known/openapi.json
Pricing: https://ai-risk-oracle.fly.dev/pricing

Useful feedback would be whether the verification contract is clear enough for
agent builders to integrate before tool execution, and whether the receipt shape
is useful for audit or downstream policy systems.
```
