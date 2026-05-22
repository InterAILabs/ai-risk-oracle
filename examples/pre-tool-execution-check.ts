import { InterAIRiskOracleClient } from "../sdk/interai-risk-oracle.ts"

const client = new InterAIRiskOracleClient({
  baseUrl: process.env.ORACLE_BASE_URL || "http://localhost:3000",
  apiKey: process.env.ORACLE_API_KEY
})

async function main() {
  const verification = await client.verify(
    {
      prompt:
        "A coding agent wants to run a migration that deletes old temporary records. Verify the plan before tool execution.",
      response:
        "Run a dry-run query first, check the affected row count, then execute only against records older than 30 days.",
      domain: "tool-execution"
    },
    "pre-tool-execution-check-example-1"
  )

  const allowToolExecution =
    verification.trust_recommended_action === "accept" ||
    (verification.trust_recommended_action === "review" &&
      verification.risk_level !== "high")

  console.log({
    allow_tool_execution: allowToolExecution,
    risk_level: verification.risk_level,
    risk_factors: verification.risk_factors,
    receipt_id: verification.trust_receipt.receipt_id
  })
}

main().catch((error) => {
  console.error("PRE_TOOL_EXECUTION_CHECK_EXAMPLE_FAILED")
  console.error(error)
  process.exit(1)
})
