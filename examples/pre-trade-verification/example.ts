const baseUrl = "https://ai-risk-oracle.fly.dev"
const credential = "replace-with-your-credential"

const response = await fetch(`${baseUrl}/verify`, {
  method: "POST",
  headers: {
    authorization: `Bearer ${credential}`,
    "content-type": "application/json"
  },
  body: JSON.stringify({
    use_case: "pre-trade-verification",
    action: {
      type: "trade",
      description: "Submit autonomous portfolio rebalance order",
      amount_usd: 500,
      currency: "USD",
      irreversible: false,
      external_side_effect: true
    },
    context: {
      agent_id: "trading_agent_001",
      environment: "paper",
      user_confirmation: false
    },
    policy: {
      max_risk_level: "medium",
      require_trust_receipt: true,
      amount_usd_limit: 1000,
      allowed_action_types: ["trade"],
      require_human_review_above: 0.75
    }
  })
})

console.log(await response.json())
