const baseUrl = "https://ai-risk-oracle.fly.dev"
const credential = "replace-with-your-credential"

const response = await fetch(`${baseUrl}/verify`, {
  method: "POST",
  headers: {
    authorization: `Bearer ${credential}`,
    "content-type": "application/json"
  },
  body: JSON.stringify({
    use_case: "autonomous-wallet-gate",
    action: {
      type: "wallet_transaction",
      description: "Authorize an autonomous wallet transfer",
      amount_usd: 75,
      currency: "USD",
      irreversible: false,
      external_side_effect: true
    },
    context: {
      wallet_policy_id: "wallet_policy_beta",
      environment: "production",
      user_confirmation: false
    },
    policy: {
      max_risk_level: "low",
      require_trust_receipt: true,
      amount_usd_limit: 100,
      require_human_review_above: 0.5
    }
  })
})

console.log(await response.json())

export {}
