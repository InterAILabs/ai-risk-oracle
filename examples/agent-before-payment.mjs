import { InterAIRiskOracleClient } from "../sdk/interai-risk-oracle.ts"

const BASE_URL = process.env.ORACLE_BASE_URL || "http://localhost:3000"
const API_KEY = process.env.ORACLE_API_KEY

function requireApiKey() {
  if (!API_KEY) {
    throw new Error("Set ORACLE_API_KEY before running this example.")
  }
}

async function releasePayment() {
  return {
    paid: true,
    recipient: "vendor-agent-42",
    amount_usdc: "12.50"
  }
}

async function main() {
  requireApiKey()

  const client = new InterAIRiskOracleClient({
    baseUrl: BASE_URL,
    apiKey: API_KEY
  })

  const verification = await client.verify(
    {
      prompt:
        "An agent is about to pay a vendor agent for a completed delivery. Verify whether the output is trustworthy enough before releasing payment.",
      response:
        "The delivery matches the approved invoice, includes the required completion evidence, and should be reviewed before payment is released.",
      domain: "agentic-commerce",
      mode: "semantic_judge"
    },
    process.env.IDEMPOTENCY_KEY || "agent-before-payment-demo-v1"
  )
  const verdict = verification.verdict || verification.trust_recommended_action
  const receiptId = verification.trust_receipt.receipt_id
  const publicReceipt = await client.getTrustReceipt(receiptId)

  console.log("verification")
  console.log(JSON.stringify({
    verdict,
    trust_score: verification.trust_score,
    risk_level: verification.risk_level,
    receipt_id: receiptId,
    public_receipt_url: `${BASE_URL}/trust/receipts/${receiptId}`
  }, null, 2))

  console.log("public_receipt")
  console.log(JSON.stringify(publicReceipt, null, 2))

  if (verdict === "accept") {
    const payment = await releasePayment()
    console.log("payment")
    console.log(JSON.stringify(payment, null, 2))
    return
  }

  if (verdict === "review") {
    console.log("payment")
    console.log(JSON.stringify({
      paid: false,
      reason: "review_required",
      next_action: "Hold funds until the receipt and delivery evidence are reviewed."
    }, null, 2))
    return
  }

  console.log("payment")
  console.log(JSON.stringify({
    paid: false,
    reason: "blocked_by_oracle",
    next_action: "Do not release funds; request stronger evidence from the vendor agent."
  }, null, 2))
}

main().catch((error) => {
  console.error("AGENT_BEFORE_PAYMENT_EXAMPLE_FAILED")
  console.error(error)
  process.exit(1)
})
