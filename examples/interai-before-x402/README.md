# InterAI before x402

This example demonstrates the boundary InterAI is designed to enforce:

**an agent may be technically able to pay, but InterAI decides whether this exact economic action should execute under the current authority and policy.**

The proof uses a live x402-gated web-search resource and the canonical InterAI API at `https://api.interailabs.dev`.

## Execution flow

1. Discover a live x402 `402 Payment Required` challenge.
2. Select exact USDC on Base mainnet and reject any requirement above the local `0.05 USDC` cap.
3. Build a host-attested `interai-canonical-action/v1` binding the exact target, method, amount, network, asset, recipient, and payment scheme.
4. Ask InterAI for an `autonomous_execution` decision with a short-lived execution authorization.
5. Require `allow` + policy `allow` + DecisionReceipt + execution intent + `ExecutionAuthorization`.
6. If live payment is enabled, rebuild the final action immediately before dispatch, fetch the owner-authenticated receipt, validate the signed receipt and exact intent, and atomically consume the single-use authorization.
7. Only then allow the x402 client to sign and retry the paid request.
8. Keep the InterAI trust receipt ID and execution-intent digest alongside the x402 settlement evidence.

This keeps the two responsibilities separate: x402 handles **how to pay**; InterAI handles **whether this exact payment action is authorized to proceed**.

## Safety properties

External payment is **disabled by default**. Without `LIVE_X402=true`, the script discovers the live payment requirement and requests an InterAI decision, but it does not consume the execution authorization and does not create or submit a payment.

In live mode:

- exact scheme, Base mainnet, USDC asset, atomic amount, recipient, and target are bound before execution;
- the x402 client independently retains a `0.05 USDC` maximum-payment cap;
- `review_required`, `block`, incomplete `allow`, expired authorization, receipt failure, intent mismatch, or replay all fail closed before payment;
- authorization replay consumption is stored in a local SQLite database;
- no wallet key is committed or logged.

A payment failure after authorization consumption requires a fresh InterAI verification. That is intentional: execution authorization is single-use.

## Requirements

- Node.js 22+
- an InterAI prepaid API key with enough balance for one verification
- for an actual x402 payment only: a dedicated Base test wallet with enough USDC for the selected resource

The example uses the published `interai-risk-oracle@0.1.7-beta` SDK for receipt and execution-authorization validation.

## Run without paying the external resource

```powershell
cd examples/interai-before-x402
npm install
$env:ORACLE_API_KEY="your_interai_api_key"
npm start
```

Expected boundary:

```text
live x402 challenge
  -> exact canonical action
  -> InterAI ALLOW / REVIEW_REQUIRED / BLOCK
  -> DecisionReceipt + exact-intent authorization when eligible
  -> payment intentionally withheld because LIVE_X402 is off
```

`ORACLE_BASE_URL` may be set deliberately to test another InterAI deployment; otherwise the canonical `https://api.interailabs.dev` endpoint is used.

## Run a controlled live payment

Use only a dedicated wallet with a deliberately small balance.

```powershell
$env:ORACLE_API_KEY="your_interai_api_key"
$env:EVM_PRIVATE_KEY="0x..."
$env:LIVE_X402="true"
npm start
```

Optional controls:

```powershell
$env:INTERAI_OPERATION_ID="your-stable-operation-id"
$env:INTERAI_REPLAY_DB="./interai-x402-replay.sqlite"
```

A fresh operation ID is generated automatically for each run when `INTERAI_OPERATION_ID` is not supplied. Reusing an operation ID is useful only for deliberate retry/idempotency testing; do not reuse an expired authorization for a new execution attempt.

On successful dispatch the script reports whether the paid resource returned x402 settlement evidence and prints the InterAI `trust_receipt_id` plus `execution_intent_digest` for correlation.

## Live validation

A controlled live economic proof was completed on 2026-09-21 using this integration path:

- InterAI returned `allow`;
- effective policy returned `allow`;
- a signed DecisionReceipt and single-use `ExecutionAuthorization` were issued;
- the authorized x402 request settled `0.020000 USDC` on Base;
- the paid request returned HTTP `200`;
- `PAYMENT-RESPONSE` reported `success: true`;
- settlement evidence was correlated with the InterAI trust receipt ID and execution-intent digest;
- the authorization was consumed exactly once.

Confirmed Base transaction:

`0xdcf1b9b9c2a14ecc9e74b417f23ae6ae6492f5b22a32cb10270fc74055a951ad`

This validation is evidence for this controlled reference flow; it is not a claim of unrestricted production readiness.

## Decision invariant

The payment path requires a complete executable authority result:

```ts
const authorizing =
  decision.recommended_action === "allow" &&
  decision.policy_result === "allow" &&
  Boolean(decision.trust_receipt_id) &&
  Boolean(decision.execution_intent) &&
  Boolean(decision.execution_authorization)
```

That check is necessary but not sufficient. Immediately before the side effect, the example also calls `validateAndConsumeReceipt(...)` against a rebuilt final intent. Any mismatch or replay stops execution.

## What this proves

This is a reference integration for a real economic side effect. InterAI does not sign the x402 payment and does not claim the payment succeeded. It authorizes—or refuses to authorize—the exact proposed action, while the host retains wallet custody, payment controls, dispatch responsibility, replay storage, and settlement evidence.
