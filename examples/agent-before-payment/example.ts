const baseUrl = "https://ai-risk-oracle.fly.dev"
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
      name: "release_vendor_payment",
      description: "Release vendor payment after delivery",
      amount_usd: 125,
      currency: "USD",
      irreversible: false,
      external_side_effect: true
    },
    context: {
      agent_id: "buyer_agent_001",
      environment: "production",
      counterparty_id: "vendor_agent_456",
      user_confirmation: false
    },
    policy: {
      max_risk_level: "medium",
      require_trust_receipt: true,
      amount_usd_limit: 500,
      blocked_action_types: ["irreversible_transfer"],
      require_human_review_above: 0.75
    }
  })
})

const body = await decision.json()
console.log(body)

if (body.recommended_action !== "allow") {
  throw new Error(`Payment paused: ${body.recommended_action}`)
}
