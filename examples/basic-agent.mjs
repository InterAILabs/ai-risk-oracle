import { InterAIRiskOracleClient } from "../sdk/interai-risk-oracle.ts"

const BASE_URL = process.env.ORACLE_BASE_URL || "http://localhost:3000"

async function main() {
  const client = new InterAIRiskOracleClient({
    baseUrl: BASE_URL
  })

  console.log("STEP 1: onboard")
  const onboard = await client.onboard({
    name: "basic-agent-example"
  })

  console.log(JSON.stringify({
    api_key_prefix: onboard.api_key?.slice(0, 16),
    account_id: onboard.account?.id,
    balance: onboard.balance
  }, null, 2))

  console.log("\nSTEP 2: optional dev funding")
  if (String(process.env.USE_DEV_CREDIT || "true").toLowerCase() === "true") {
    const credit = await client.devCredit("0.01")
    console.log(JSON.stringify(credit, null, 2))
  } else {
    console.log("Skipping dev credit. Use onchain topup in production.")
  }

  console.log("\nSTEP 3: verify")
  const verify = await client.verify(
    {
      prompt: "What is the capital of France?",
      response: "Paris",
      domain: "general"
    },
    "basic-agent-example-verify-1"
  )
  console.log(JSON.stringify(verify, null, 2))

  console.log("\nSTEP 4: verify batch")
  const batch = await client.verifyBatch(
    {
      items: [
        {
          prompt: "What is the capital of France?",
          response: "Paris",
          domain: "general"
        },
        {
          prompt: "2 + 2 = ?",
          response: "4",
          domain: "general"
        }
      ]
    },
    "basic-agent-example-batch-1"
  )
  console.log(JSON.stringify(batch, null, 2))

  console.log("\nSTEP 5: trust receipts")
  const receipts = await client.trustReceipts(10)
  console.log(JSON.stringify(receipts, null, 2))

  const latestReceiptId = receipts?.receipts?.[0]?.receipt_id
  if (latestReceiptId) {
    console.log("\nSTEP 6: canonical trust receipt lookup")
    const publicReceipt = await client.getTrustReceipt(latestReceiptId)
    console.log(JSON.stringify(publicReceipt, null, 2))
  }

  console.log("\nSTEP 7: me")
  const me = await client.me()
  console.log(JSON.stringify(me, null, 2))

  console.log("\nDONE")
}

main().catch((err) => {
  console.error("BASIC_AGENT_EXAMPLE_ERROR")
  console.error(err)
  process.exit(1)
})
