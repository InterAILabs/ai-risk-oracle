const baseUrl = "https://ai-risk-oracle.fly.dev"
const credential = "replace-with-your-credential"

const response = await fetch(`${baseUrl}/verify`, {
  method: "POST",
  headers: {
    authorization: `Bearer ${credential}`,
    "content-type": "application/json",
    "x-idempotency-key": "agent-before-tool-example-1"
  },
  body: JSON.stringify({
    use_case: "agent-before-tool-execution",
    action: {
      type: "tool_call",
      name: "send_email_to_customer",
      description: "Send an account notice to a customer",
      irreversible: false,
      external_side_effect: true
    },
    context: {
      agent_id: "support_agent_001",
      environment: "production",
      user_confirmation: false
    },
    policy: {
      max_risk_level: "medium",
      require_trust_receipt: true,
      allowed_action_types: ["tool_call"],
      require_human_review_above: 0.75
    }
  })
})

console.log(await response.json())

export {}
