const baseUrl = "https://api.interai.example/v1"
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
      amount_usd: 75
    },
    context: {
      wallet_policy_id: "wallet_policy_beta",
      environment: "production"
    },
    policy: {
      max_risk_level: "low",
      require_trust_receipt: true
    }
  })
})

console.log(await response.json())
