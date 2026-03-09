const API = "https://ai-risk-oracle.fly.dev"

async function run() {
  const quote = await fetch(`${API}/quote`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ mode: "fast" })
  }).then(r => r.json())

  console.log("QUOTE:")
  console.log(quote)

  const confirm = await fetch(`${API}/pay/confirm`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-admin-token": "admin123"
    },
    body: JSON.stringify({
      payment_reference: quote.payment_reference
    })
  }).then(r => r.json())

  console.log("CONFIRM:")
  console.log(confirm)

  const result = await fetch(`${API}/verify`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Payment-Ref": quote.payment_reference
    },
    body: JSON.stringify({
      prompt: "What is Paris?",
      response: "Paris is the capital of France",
      domain: "general"
    })
  }).then(r => r.json())

  console.log("VERIFY:")
  console.log(result)
}

run().catch(console.error)
