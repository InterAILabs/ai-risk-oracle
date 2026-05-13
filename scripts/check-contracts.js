import assert from "node:assert/strict"
import fs from "node:fs"
import os from "node:os"
import path from "node:path"

const REQUIRED_OPENAPI_PATHS = [
  "/onboard",
  "/me",
  "/pricing",
  "/verify",
  "/verify/batch",
  "/trust/receipts",
  "/trust/receipts/{receiptId}",
  "/trust/reputation",
  "/trust/verify-signature",
  "/.well-known/agent.json",
  "/.well-known/discovery-bundle.json",
  "/mcp",
  "/a2a"
]

function check(condition, message) {
  assert.ok(condition, message)
  console.log(`[OK] ${message}`)
}

async function main() {
  const previousDbFile = process.env.PAYMENTS_DB_FILE
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "ai-risk-oracle-contracts-"))
  process.env.PAYMENTS_DB_FILE = path.join(tempDir, "payments.db")

  const { createApp } = await import("../dist/server.js")
  const { InterAIRiskOracleClient } = await import("ai-risk-oracle")

  check(typeof InterAIRiskOracleClient === "function", "sdk package export is importable")

  const app = await createApp()

  const getJson = async (url) => {
    const response = await app.inject({
      method: "GET",
      url,
      headers: {
        Host: "localhost:3000"
      }
    })

    assert.equal(response.statusCode, 200, `${url} should return 200`)
    return response.json()
  }

  try {
    const openapi = await getJson("/.well-known/openapi.json")
    check(openapi.openapi === "3.0.3", "openapi version is stable")
    check(openapi.info?.title === "InterAI Risk Oracle", "openapi title is present")
    check(Boolean(openapi.components?.securitySchemes?.bearerAuth), "openapi declares bearer auth")

    for (const pathName of REQUIRED_OPENAPI_PATHS) {
      check(Boolean(openapi.paths?.[pathName]), `openapi documents ${pathName}`)
    }

    const verifySchema = await getJson("/schemas/verify-result.json")
    check(
      verifySchema.required?.includes("trust_receipt"),
      "verify-result schema requires trust_receipt"
    )
    check(
      verifySchema.required?.includes("historical_context"),
      "verify-result schema requires historical_context"
    )
    check(
      verifySchema.properties?.trust_receipt?.required?.includes("signature"),
      "verify-result trust_receipt schema includes signature fields"
    )
    check(
      verifySchema.properties?.historical_context?.required?.includes("sample_size"),
      "verify-result historical_context schema includes sample_size"
    )

    const receiptSchema = await getJson("/schemas/trust-receipt.json")
    check(
      receiptSchema.$id === "https://ai-risk-oracle/schemas/trust-receipt.json",
      "trust receipt schema has canonical id"
    )

    const publicReceiptSchema = await getJson("/schemas/trust-receipt-public.json")
    check(
      publicReceiptSchema.required?.includes("verification"),
      "public receipt schema exposes verification metadata"
    )

    const pricing = await getJson("/pricing")
    check(pricing.pricing?.verify?.cost_usdc === "0.0006", "pricing exposes verify cost")
    check(
      pricing.pricing?.idempotency?.header === "X-Idempotency-Key",
      "pricing exposes idempotency header"
    )

    const discoveryBundle = await getJson("/.well-known/discovery-bundle.json")
    check(
      discoveryBundle.interfaces?.http_api?.verify === "https://localhost:3000/verify",
      "discovery bundle exposes HTTP verify endpoint"
    )
    check(
      discoveryBundle.interfaces?.a2a?.endpoint === "https://localhost:3000/a2a",
      "discovery bundle exposes A2A endpoint"
    )
    check(
      discoveryBundle.interfaces?.mcp?.endpoint === "https://localhost:3000/mcp",
      "discovery bundle exposes MCP endpoint"
    )

    console.log("CONTRACT CHECK OK")
  } finally {
    await app.close()

    if (previousDbFile == null) {
      delete process.env.PAYMENTS_DB_FILE
    } else {
      process.env.PAYMENTS_DB_FILE = previousDbFile
    }
  }
}

main().catch((error) => {
  console.error("CONTRACT CHECK FAILED")
  console.error(error)
  process.exit(1)
})
