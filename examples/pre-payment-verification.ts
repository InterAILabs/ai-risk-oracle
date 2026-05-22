import { InterAIRiskOracleClient } from "../sdk/interai-risk-oracle.ts"

const client = new InterAIRiskOracleClient({
  baseUrl: process.env.ORACLE_BASE_URL || "http://localhost:3000",
  apiKey: process.env.ORACLE_API_KEY
})

async function main() {
  const verification = await client.verify(
    {
      prompt: "Should the purchasing agent pay invoice INV-1042 for delivered countertop installation?",
      response:
        "The invoice matches the approved order, references the completed installation, and should be paid.",
      domain: "agentic-commerce"
    },
    "pre-payment-verification-example-1"
  )

  const canSettlePayment =
    verification.trust_recommended_action === "accept" &&
    verification.trust_score >= 0.8

  console.log({
    can_settle_payment: canSettlePayment,
    trust_score: verification.trust_score,
    recommended_action: verification.trust_recommended_action,
    receipt_id: verification.trust_receipt.receipt_id
  })
}

main().catch((error) => {
  console.error("PRE_PAYMENT_VERIFICATION_EXAMPLE_FAILED")
  console.error(error)
  process.exit(1)
})
