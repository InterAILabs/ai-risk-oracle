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
  const { InterAIRiskOracleClient } = await import("../dist/sdk/interai-risk-oracle.js")

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

    const publicReceipt = await client.getTrustReceipt(verify.trust_receipt.receipt_id)

    if (publicReceipt?.receipt?.receipt_id !== verify.trust_receipt.receipt_id) {
      throw new Error("sdk_smoke_receipt_lookup_failed")
    }

    const receipts = await client.trustReceipts(10)

    if (!Array.isArray(receipts?.receipts) || receipts.receipts.length < 1) {
      throw new Error("sdk_smoke_receipts_missing")
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
