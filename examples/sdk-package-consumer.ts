import {
  InterAIRiskOracleClient,
  type BatchVerifyResult,
  type VerifyResult
} from "ai-risk-oracle"

const client = new InterAIRiskOracleClient({
  baseUrl: process.env.ORACLE_BASE_URL || "http://localhost:3000",
  apiKey: process.env.ORACLE_API_KEY
})

async function main() {
  const verify: VerifyResult = await client.verify(
    {
      prompt: "What is the capital of France?",
      response: "Paris",
      domain: "general"
    },
    "sdk-package-consumer-verify-1"
  )

  console.log({
    trust_score: verify.trust_score,
    risk_level: verify.risk_level,
    receipt_id: verify.trust_receipt.receipt_id
  })

  const batch: BatchVerifyResult = await client.verifyBatch(
    {
      items: [
        {
          prompt: "What is 2 + 2?",
          response: "4",
          domain: "math"
        }
      ]
    },
    "sdk-package-consumer-batch-1"
  )

  console.log({
    batch_size: batch.batch_size,
    high_risk_count: batch.summary.high_risk_count
  })

  const reputation = await client.trustReputation(10)

  console.log({
    reputation_sample_size: reputation.reputation.sample_size,
    reputation_score: reputation.reputation.reputation_score
  })
}

main().catch((error) => {
  console.error("SDK_PACKAGE_CONSUMER_EXAMPLE_FAILED")
  console.error(error)
  process.exit(1)
})
