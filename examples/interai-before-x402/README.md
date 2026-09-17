# InterAI before x402

This example demonstrates the boundary InterAI is designed to enforce:

**an agent may be technically able to pay, but InterAI decides whether this exact economic action should happen.**

The flow is:

1. Discover a live x402 payment requirement from a paid API.
2. Bind the exact target, amount, network, asset, recipient, and scheme into an InterAI `autonomous_execution` verification.
3. Require both `recommended_action === "allow"` and `policy_result === "allow"`.
4. Only then allow the x402 client to sign and retry the paid request.
5. Keep the InterAI trust receipt ID together with the x402 settlement evidence.

The sample resource is Agent402 web search (`GET https://agent402.tools/api/search`), currently priced at $0.02 per call and payable in USDC over x402. The example specifically selects exact USDC on Base mainnet and enforces a local hard cap of $0.05.

## Safety properties

The payment is **disabled by default**. Without `LIVE_X402=true`, the script performs discovery and asks InterAI for a decision, but it will not create or submit a payment.

Even in live mode, the x402 client is constrained to the same payment requirement that InterAI evaluated: exact scheme, Base mainnet, USDC, amount, and recipient must all match. A separate x402 spend cap remains active as a second boundary.

No wallet key is committed or logged.

## Requirements

- Node.js 22+
- an InterAI prepaid API key with enough balance for one verification
- for an actual x402 payment only: a funded Base wallet private key with enough USDC

## Run without paying the external x402 resource

```powershell
cd examples/interai-before-x402
npm install
$env:ORACLE_API_KEY="your_interai_api_key"
npm start
```

Expected flow:

```text
x402 402 challenge
  -> exact economic action bound into InterAI
  -> ALLOW / REVIEW_REQUIRED / BLOCK
  -> payment withheld unless ALLOW + policy ALLOW
```

## Run the live payment

Only do this with a wallet created for testing and a deliberately small balance.

```powershell
$env:ORACLE_API_KEY="your_interai_api_key"
$env:EVM_PRIVATE_KEY="0x..."
$env:LIVE_X402="true"
npm start
```

On an approved decision the script performs the paid request and prints whether a `PAYMENT-RESPONSE` settlement header was returned. It also prints the InterAI `trust_receipt_id` so the decision evidence and payment evidence can be correlated.

## Decision invariant

The external payment path is gated by:

```ts
const approved =
  decision.recommended_action === "allow" &&
  decision.policy_result === "allow"
```

Anything else stops before payment.

## Why this matters

x402 answers **how an agent can pay for a resource**. InterAI answers a different question: **whether this exact agent action is authorized to proceed under the current authority and policy boundary**.

The two layers are complementary. InterAI does not execute the external action and does not replace the payment protocol; it decides whether the surrounding execution system should proceed and records the decision as a trust receipt.
