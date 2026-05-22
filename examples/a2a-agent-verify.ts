import { InterAIRiskOracleClient } from "../sdk/interai-risk-oracle.ts"

const client = new InterAIRiskOracleClient({
  baseUrl: process.env.ORACLE_BASE_URL || "http://localhost:3000",
  apiKey: process.env.ORACLE_API_KEY
})

async function main() {
  const response = await client.a2aVerify(
    {
      prompt: "Should an agent accept this answer about the capital of France?",
      response: "The answer Paris is correct.",
      domain: "agent-handoff"
    },
    "a2a-agent-verify-example-1"
  )

  console.log(JSON.stringify(response, null, 2))
}

main().catch((error) => {
  console.error("A2A_AGENT_VERIFY_EXAMPLE_FAILED")
  console.error(error)
  process.exit(1)
})
