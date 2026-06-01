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
  action: {
    type: "tool_call",
    name: "send_account_notice",
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
})

if (decision.recommended_action === "allow") {
  // Execute the downstream action.
}
```
