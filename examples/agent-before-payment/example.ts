const baseUrl = "https://api.interai.example/v1"
const credential = "replace-with-your-credential"

const decision = await fetch(`${baseUrl}/verify`, {
  method: "POST",
  headers: {
    authorization: `Bearer ${credential}`,
    "content-type": "application/json"
  },
  body: JSON.stringify({
    use_case: "agent-before-payment",
    action: {
      type: "payment",
      description: "Release vendor payment after delivery",
      amount_usd: 125
    },
    context: {
      agent_id: "buyer_agent_001",
      counterparty_id: "vendor_agent_456"
    },
    policy: {
      max_risk_level: "medium",
      require_trust_receipt: true
    }
  })
})

const body = await decision.json()
console.log(body)

if (body.recommended_action !== "accept") {
  throw new Error(`Payment paused: ${body.recommended_action}`)
}
