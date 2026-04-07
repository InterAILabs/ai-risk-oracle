import { InterAIRiskOracleClient } from "../sdk/interai-risk-oracle.ts"

const BASE_URL = "http://localhost:3000"

async function main() {
  const client = new InterAIRiskOracleClient({
    baseUrl: BASE_URL
  })

  console.log("\n1) Onboard")
  const onboard = await client.onboard({
    name: "demo-sdk-agent"
  })
  console.log(onboard)

  console.log("\n2) Me")
  const me = await client.me()
  console.log(me)

  console.log("\n3) Dev credit (auto funding)")
  const credit = await client.devCredit("0.01")
  console.log(credit)

  console.log("\n4) Verify")
  const verify = await client.verify({
    prompt: "What is the capital of France?",
    response: "Paris",
    domain: "general"
  }, "sdk-demo-1")
  console.log(verify)

  console.log("\n5) Verify batch")
  const batch = await client.verifyBatch({
    items: [
      {
        prompt: "What is the capital of France?",
        response: "Paris"
      },
      {
        prompt: "2 + 2 = ?",
        response: "4"
      }
    ]
  }, "sdk-batch-1")

  console.log(batch)

  console.log("\nDone 🚀")
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})