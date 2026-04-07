import { InterAIRiskOracleClient } from "../sdk/interai-risk-oracle.ts"

const BASE_URL = process.env.ORACLE_BASE_URL || "https://ai-risk-oracle.fly.dev"

async function main() {
  const client = new InterAIRiskOracleClient({
    baseUrl: BASE_URL
  })

  console.log("STEP 1: onboard")
  const onboard = await client.onboard({
    name: "basic-agent-production-example"
  })

  console.log(JSON.stringify({
    account_id: onboard.account?.id,
    api_key_prefix: onboard.api_key?.slice(0, 16),
    balance: onboard.balance,
    funding: onboard.funding
  }, null, 2))

  console.log("\nSTEP 2: create topup intent")
  const topup = await client.createTopup("0.01")
  console.log(JSON.stringify(topup, null, 2))

  console.log("\nNEXT")
  console.log("Send USDC on Base to the returned address, then confirm with /topup/confirm.")
}

main().catch((err) => {
  console.error("BASIC_AGENT_PRODUCTION_EXAMPLE_ERROR")
  console.error(err)
  process.exit(1)
})