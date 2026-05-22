import { InterAIRiskOracleClient } from "../sdk/interai-risk-oracle.ts"

const client = new InterAIRiskOracleClient({
  baseUrl: process.env.ORACLE_BASE_URL || "http://localhost:3000",
  apiKey: process.env.ORACLE_API_KEY
})

async function main() {
  await client.mcpInitialize()

  const response = await client.mcpToolCall("oracle.verify_response", {
    prompt: "What is the capital of France?",
    response: "Paris",
    domain: "general",
    idempotency_key: "mcp-agent-verify-example-1"
  })

  console.log(JSON.stringify(response, null, 2))
}

main().catch((error) => {
  console.error("MCP_AGENT_VERIFY_EXAMPLE_FAILED")
  console.error(error)
  process.exit(1)
})
