const baseUrl = "https://ai-risk-oracle.fly.dev"
const credential = "replace-with-your-credential"

const response = await fetch(`${baseUrl}/verify`, {
  method: "POST",
  headers: {
    authorization: `Bearer ${credential}`,
    "content-type": "application/json"
  },
  body: JSON.stringify({
    use_case: "agent-before-tool-execution",
    action: {
      type: "tool_call",
      name: "send_email_to_customer",
      description: "Send an account notice to a customer"
    },
    context: {
      agent_id: "support_agent_001",
      environment: "production"
    },
    policy: {
      max_risk_level: "medium",
      require_trust_receipt: true
    }
  })
})

console.log(await response.json())
