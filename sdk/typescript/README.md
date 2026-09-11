# TypeScript SDK

Typed hosted API client for InterAI Risk Oracle.

Published package:

```bash
npm install interai-risk-oracle
```

Current published beta: `interai-risk-oracle@0.1.3-beta`.

```ts
import { InterAIRiskOracleClient } from "interai-risk-oracle"

const client = new InterAIRiskOracleClient({
  baseUrl: "https://ai-risk-oracle.fly.dev",
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

For an `allow`, verify the DecisionReceipt with the service, rebuild the final host intent, then validate the exact binding before dispatch. `ExecutionAuthorization` is single-use and expires in 1–300 seconds (60 seconds default); persist atomic consumption in your own runtime when replay protection must survive processes.

```ts
import { validateExecutionAuthorization } from "interai-risk-oracle"

const lookup = await client.getTrustReceipt(decision.trust_receipt_id!)
const signature = await client.verifyTrustReceiptSignature(lookup)
const gate = await validateExecutionAuthorization({
  authorization: decision.execution_authorization,
  finalIntent: rebuildFinalIntentAtHostBoundary(),
  receiptSignatureValid: signature.valid
})
if (!gate.ok) throw new Error(`Do not dispatch: ${gate.code}`)
```

`verify` generates an idempotency key when one is not provided. Supply a stable
business-operation key when retries must resolve to the same billed result.

For a portable signature check, fetch a lookup and forward its opaque signed
payload without parsing it:

```ts
const receipt = await client.getTrustReceipt(decision.trust_receipt_id!)
const signatureCheck = await client.verifyTrustReceiptSignature(receipt)
```

Build and inspect the package locally:

```bash
npm run build
npm pack --dry-run
```
