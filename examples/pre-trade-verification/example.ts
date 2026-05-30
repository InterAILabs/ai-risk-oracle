const baseUrl = "https://api.interai.example/v1"
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
      amount_usd: 500
    },
    context: {
      agent_id: "trading_agent_001",
      environment: "paper"
    },
    policy: {
      max_risk_level: "medium",
      require_trust_receipt: true
    }
  })
})

console.log(await response.json())
