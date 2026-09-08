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
    type: "tool_call",
    description: "Send account notice",
    external_side_effect: true
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
