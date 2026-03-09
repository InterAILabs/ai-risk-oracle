const API = "https://ai-risk-oracle.fly.dev"

async function runOnce(i) {
  const quote = await fetch(`${API}/quote`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ mode: "fast" })
  }).then(r => r.json())

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

  console.log(`run ${i}:`, {
    payment_reference: quote.payment_reference,
    confirm,
    risk_level: result.risk_level,
    consistency_score: result.consistency_score
  })
}

async function main() {
  for (let i = 1; i <= 10; i++) {
    await runOnce(i)
  }
  console.log("REPEAT TEST OK")
}

main().catch(err => {
  console.error("REPEAT TEST FAILED")
  console.error(err)
  process.exit(1)
})