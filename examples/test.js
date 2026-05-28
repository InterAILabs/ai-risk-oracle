const API = process.env.ORACLE_URL || "https://ai-risk-oracle.fly.dev"

async function run() {
  const result = await fetch(`${API}/verify`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      prompt: "What is 2 + 2?",
      response: "4",
      domain: "general"
    })
  })

  const paymentRequired = result.headers.get("PAYMENT-REQUIRED")
  const body = await result.json()

  console.log({
    status: result.status,
    payment_required: Boolean(paymentRequired),
    error: body.error,
    hint: body.hint
  })
}

run().catch(console.error)
