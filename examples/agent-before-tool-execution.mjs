import { InterAIRiskOracleClient } from "../sdk/interai-risk-oracle.ts"

const BASE_URL = process.env.ORACLE_BASE_URL || "http://localhost:3000"
const API_KEY = process.env.ORACLE_API_KEY

function requireApiKey() {
  if (!API_KEY) {
    throw new Error("Set ORACLE_API_KEY before running this example.")
  }
}

async function executeRiskyTool() {
  return {
    executed: true,
    tool: "cleanup_temp_sessions",
    mode: "dry-run-first",
    affected_rows: 148
  }
}

async function main() {
  requireApiKey()

  const client = new InterAIRiskOracleClient({
    baseUrl: BASE_URL,
    apiKey: API_KEY
  })

  const candidate = {
    prompt:
      "A coding agent wants to clean temporary session records before a deploy. Decide whether the tool call is safe to execute.",
    response:
      "Run a dry-run query first, verify the affected row count, then delete only temporary sessions older than 30 days.",
    domain: "tool-execution",
    mode: "semantic_judge"
  }

  const verification = await client.verify(
    candidate,
    process.env.IDEMPOTENCY_KEY || "agent-before-tool-execution-demo-v1"
  )
  const verdict = verification.verdict || verification.trust_recommended_action

  console.log("verification")
  console.log(JSON.stringify({
    verdict,
    trust_score: verification.trust_score,
    risk_level: verification.risk_level,
    risk_factors: verification.risk_factors,
    semantic_judge: verification.semantic_judge,
    receipt_id: verification.trust_receipt.receipt_id
  }, null, 2))

  if (verdict === "accept") {
    const toolResult = await executeRiskyTool()
    console.log("tool_execution")
    console.log(JSON.stringify(toolResult, null, 2))
    return
  }

  if (verdict === "review") {
    console.log("tool_execution")
    console.log(JSON.stringify({
      executed: false,
      reason: "review_required",
      next_action: "Ask a human/operator to inspect the receipt before running the tool."
    }, null, 2))
    return
  }

  console.log("tool_execution")
  console.log(JSON.stringify({
    executed: false,
    reason: "blocked_by_oracle",
    next_action: "Rewrite the plan with evidence and safer constraints, then verify again."
  }, null, 2))
}

main().catch((error) => {
  console.error("AGENT_BEFORE_TOOL_EXECUTION_EXAMPLE_FAILED")
  console.error(error)
  process.exit(1)
})
