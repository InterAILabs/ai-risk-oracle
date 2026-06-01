# TypeScript SDK

Minimal hosted API client for InterAI Risk Oracle.

```ts
import { InterAIRiskOracleClient } from "@interai/risk-oracle"

const client = new InterAIRiskOracleClient({
  baseUrl: "https://ai-risk-oracle.fly.dev",
  apiKey: "replace-with-your-credential"
})

const decision = await client.verify({
  use_case: "agent-before-tool-execution",
  action: { type: "tool_call", description: "Send account notice" },
  context: { agent_id: "agent_123" },
  policy: { max_risk_level: "medium", require_trust_receipt: true }
})
```
