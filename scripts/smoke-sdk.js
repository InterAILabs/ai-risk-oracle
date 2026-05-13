import fs from "fs"
import os from "os"
import path from "path"

async function main() {
  const previousDevTopup = process.env.DEV_TOPUP_ENABLED
  const previousDbFile = process.env.PAYMENTS_DB_FILE
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "ai-risk-oracle-sdk-"))
  process.env.DEV_TOPUP_ENABLED = "true"
  process.env.PAYMENTS_DB_FILE = path.join(tempDir, "payments.db")

  const { createApp } = await import("../dist/server.js")
  const { InterAIRiskOracleClient } = await import("ai-risk-oracle")

  const app = await createApp()

  try {
    await app.listen({ port: 0, host: "127.0.0.1" })
    const address = app.server.address()

    if (!address || typeof address === "string") {
      throw new Error("sdk_smoke_server_address_unavailable")
    }

    const client = new InterAIRiskOracleClient({
      baseUrl: `http://127.0.0.1:${address.port}`
    })

    const onboard = await client.onboard({
      name: "sdk-smoke-agent"
    })

    if (!onboard?.api_key) {
      throw new Error("sdk_smoke_missing_api_key")
    }

    await client.devCredit("0.01")

    const verify = await client.verify(
      {
        prompt: "What is the capital of France?",
        response: "Paris",
        domain: "general"
      },
      `sdk-smoke-verify-${Date.now()}`
    )

    if (!verify?.trust_receipt?.receipt_id) {
      throw new Error("sdk_smoke_missing_trust_receipt")
    }

    const bundle = await client.getDiscoveryBundle()

    if (bundle?.interfaces?.a2a?.endpoint == null) {
      throw new Error("sdk_smoke_missing_discovery_bundle")
    }

    const pricing = await client.getPricing()

    if (pricing?.pricing?.verify?.cost_usdc !== "0.0006") {
      throw new Error("sdk_smoke_missing_pricing")
    }

    const mcpInit = await client.mcpInitialize()

    if (mcpInit?.result?.serverInfo?.name !== "interai-risk-oracle") {
      throw new Error("sdk_smoke_mcp_initialize_failed")
    }

    const mcpTools = await client.mcpToolsList()

    if (!Array.isArray(mcpTools?.result?.tools) || mcpTools.result.tools.length < 1) {
      throw new Error("sdk_smoke_mcp_tools_list_failed")
    }

    const mcpResources = await client.mcpResourcesList()

    if (!Array.isArray(mcpResources?.result?.resources) || mcpResources.result.resources.length < 1) {
      throw new Error("sdk_smoke_mcp_resources_list_failed")
    }

    const mcpResource = await client.mcpResourceRead("oracle://service/discovery-bundle")

    if (!mcpResource?.result?.contents?.[0]?.text?.includes("verify_batch")) {
      throw new Error("sdk_smoke_mcp_resource_read_failed")
    }

    const mcpPricing = await client.mcpToolCall("oracle.get_pricing", {})

    if (!mcpPricing?.result?.content?.[0]?.text?.includes("\"trial\"")) {
      throw new Error("sdk_smoke_mcp_pricing_failed")
    }

    const mcpPrompts = await client.mcpPromptsList()

    if (!Array.isArray(mcpPrompts?.result?.prompts) || mcpPrompts.result.prompts.length < 1) {
      throw new Error("sdk_smoke_mcp_prompts_list_failed")
    }

    const mcpPrompt = await client.mcpPromptGet("verify_response")

    if (!mcpPrompt?.result?.messages?.[0]?.content?.text?.includes("oracle.verify_response")) {
      throw new Error("sdk_smoke_mcp_prompt_get_failed")
    }

    const a2a = await client.a2aVerify(
      {
        prompt: "What is the capital of France?",
        response: "Paris",
        domain: "general"
      },
      `sdk-smoke-a2a-${Date.now()}`
    )

    if (!a2a?.result?.parts?.[0]?.data?.result?.trust_receipt?.receipt_id) {
      throw new Error("sdk_smoke_a2a_missing_trust_receipt")
    }

    const mcpVerify = await client.mcpToolCall("oracle.verify_response", {
      prompt: "What is the capital of France?",
      response: "Paris",
      domain: "general",
      idempotency_key: `sdk-smoke-mcp-${Date.now()}`
    })

    if (!mcpVerify?.result?.content?.[0]?.text?.includes("trust_receipt")) {
      throw new Error("sdk_smoke_mcp_verify_failed")
    }

    const publicReceipt = await client.getTrustReceipt(verify.trust_receipt.receipt_id)

    if (publicReceipt?.receipt?.receipt_id !== verify.trust_receipt.receipt_id) {
      throw new Error("sdk_smoke_receipt_lookup_failed")
    }

    const receipts = await client.trustReceipts(10)

    if (!Array.isArray(receipts?.receipts) || receipts.receipts.length < 1) {
      throw new Error("sdk_smoke_receipts_missing")
    }

    const reputation = await client.trustReputation(10)

    if (!reputation?.reputation || reputation.reputation.sample_size < 1) {
      throw new Error("sdk_smoke_reputation_missing")
    }

    console.log("SDK SMOKE OK")
  } finally {
    await app.close()

    if (previousDevTopup == null) {
      delete process.env.DEV_TOPUP_ENABLED
    } else {
      process.env.DEV_TOPUP_ENABLED = previousDevTopup
    }

    if (previousDbFile == null) {
      delete process.env.PAYMENTS_DB_FILE
    } else {
      process.env.PAYMENTS_DB_FILE = previousDbFile
    }
  }
}

main().catch((error) => {
  console.error("SDK SMOKE FAILED")
  console.error(error)
  process.exit(1)
})
