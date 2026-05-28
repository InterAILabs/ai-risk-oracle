import { InterAIRiskOracleClient, OracleHttpError } from "../sdk/interai-risk-oracle.ts"

const BASE_URL = process.env.ORACLE_BASE_URL || "https://ai-risk-oracle.fly.dev"

async function main() {
  const client = new InterAIRiskOracleClient({
    baseUrl: BASE_URL
  })

  const onboard = await client.onboard({
    name: `semantic-judge-trial-${Date.now()}`
  })

  console.log("ONBOARDED")
  console.log({
    account_id: onboard.account?.id,
    trial: onboard.trial,
    balance: onboard.balance
  })

  try {
    const result = await client.verify(
      {
        prompt:
          "Should an autonomous purchasing agent release payment after a contractor says the job is complete?",
        response:
          "Check delivery evidence, match the invoice to the approved order, verify the receipt, and request review for any mismatch before releasing payment.",
        domain: "agentic-commerce",
        mode: "semantic_judge"
      },
      `semantic-judge-trial-${Date.now()}`
    )

    console.log("SEMANTIC_JUDGE_RESULT")
    console.log({
      verdict: result.verdict,
      trust_score: result.trust_score,
      risk_level: result.risk_level,
      semantic_judge: result.semantic_judge,
      receipt_id: result.trust_receipt.receipt_id,
      signed: result.trust_receipt.signed
    })
  } catch (error) {
    if (error instanceof OracleHttpError && error.status === 402) {
      console.error("PAYMENT_REQUIRED")
      console.error(error.body)
      process.exit(2)
    }

    throw error
  }
}

main().catch((error) => {
  console.error("SEMANTIC_JUDGE_TRIAL_EXAMPLE_FAILED")
  console.error(error)
  process.exit(1)
})
