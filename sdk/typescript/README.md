# TypeScript SDK

Typed hosted API client for InterAI Risk Oracle.

Package version: `interai-risk-oracle@0.1.7-beta`.

```bash
npm install interai-risk-oracle@0.1.7-beta
```

## Zero-funding builder trial

A new builder can reach a first hosted verification without moving funds. The controlled demo trial is bounded by InterAI's trial TTL, per-client limits, shared budget, and maximum-verification count.

```ts
import { InterAIRiskOracleClient } from "interai-risk-oracle"

const client = new InterAIRiskOracleClient({
  baseUrl: "https://api.interailabs.dev"
})

const onboarding = await client.onboard({
  name: "my-agent",
  scope: "demo_trial"
})

const decision = await client.verify({
  use_case: "agent-before-tool-execution",
  action: {
    type: "read_only_lookup",
    name: "check_order_status",
    description: "Read an order status in a sandbox",
    external_side_effect: false,
    irreversible: false
  },
  context: {
    agent_id: "my-agent",
    environment: "sandbox",
    user_confirmation: true
  },
  policy: { require_trust_receipt: true }
})

const receipt = await client.getTrustReceipt(decision.trust_receipt_id!)
```

`onboard()` stores the returned API key on the client when one is issued. The demo trial is for bounded integration evaluation; it is not a source of transferable funds and does not bypass normal production funding requirements.

## Funded builder workflow

The same client can create a standard account, retain the returned API key, inspect the account, quote usage, and manage a prepaid top-up without hand-building HTTP requests:

```ts
const client = new InterAIRiskOracleClient({
  baseUrl: "https://api.interailabs.dev"
})

await client.onboard({
  name: "my-funded-agent",
  scope: "standard"
})

const account = await client.me()
const quote = await client.quote({ mode: "fast" })
const topup = await client.createTopup("0.10")
```

You can also set a key explicitly with `setApiKey()`.

Top-up helpers cover `createTopup()`, `topupStatus()`, and `confirmTopup()`. Account helpers include `me()`, `ledger()`, and `usage()`. HTTP failures raise `OracleHttpError` with `status`, structured API `code`, response headers, body, and parsed x402 payment requirements when present.

## Pre-execution verification

```ts
const client = new InterAIRiskOracleClient({
  baseUrl: "https://api.interailabs.dev",
  apiKey: process.env.INTERAI_API_KEY
})

const decision = await client.verify({
  use_case: "agent-before-tool-execution",
  action: {
    schema: "interai-canonical-action/v1",
    tool_id: "notifications.send_account_notice",
    type: "email_send",
    operation: "send_account_notice",
    arguments: { account_id: "account_123" },
    external_side_effect: true,
    irreversible: false
  },
  execution_context: {
    schema: "interai-host-execution-context/v1",
    workspace_id: "workspace_123",
    environment: "production"
  },
  context: {
    agent_id: "agent_123",
    environment: "production",
    user_confirmation: false
  },
  policy: {
    max_risk_level: "medium",
    require_trust_receipt: true,
    require_human_review_above: 0.75
  }
}, "stable-business-operation-id")
```

`verify()` generates an idempotency key when one is not provided. Supply a stable business-operation key when retries must resolve to the same billed result. `verifyBatch()` provides the corresponding bounded batch surface. Request timeouts are configurable globally with `timeoutMs` and per verification call.

## Execution boundary

For an `allow`, verify the DecisionReceipt with the service, rebuild the final host intent, then validate the exact binding before dispatch. `ExecutionAuthorization` is single-use and expires in 1–300 seconds (60 seconds default); persist atomic consumption in your own runtime when replay protection must survive processes.

```ts
const lookup = await client.getTrustReceipt(decision.trust_receipt_id!)
const gate = await client.validateAndConsumeReceipt({
  lookup,
  finalIntent: rebuildFinalIntentAtHostBoundary(),
  replayStore // durable, atomic consumeOnce(key); errors must throw
})
if (!gate.ok) throw new Error(`Do not dispatch: ${gate.code}`)
```

`getTrustReceipt()` requires the owning active API key and returns complete signed evidence. If you intentionally need the anonymous existence reference, use `getTrustReceiptReference()`, whose return type is the privacy-aware union `TrustReceiptLookup | TrustReceiptPublicSummary`. The public summary contains only `receipt_id` and `issued_at`; it is not execution evidence.

For a portable signature check, fetch the owner-authenticated lookup and forward its opaque signed payload without parsing or reserializing it:

```ts
const receipt = await client.getTrustReceipt(decision.trust_receipt_id!)
const signatureCheck = await client.verifyTrustReceiptSignature(receipt)
```

Build and inspect the package locally:

```bash
npm run typecheck
npm run build
npm pack --dry-run
```

See [the durable SQLite dispatch example](../../examples/execution-boundary/README.md) for restart-safe consumption and terminal executor binding. The low-level validator alone does not prevent replay.