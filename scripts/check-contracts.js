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
  "/.well-known/ai-risk-oracle",
  "/openapi.json",
  "/discovery.json",
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
    const landing = await app.inject({
      method: "GET",
      url: "/",
      headers: {
        Host: "localhost:3000"
      }
    })
    assert.equal(landing.statusCode, 200, "/ should return 200")
    check(
      String(landing.headers["content-type"] || "").includes("text/html"),
      "landing serves HTML"
    )
    check(
      landing.body.includes("InterAI Risk Oracle"),
      "landing names the product"
    )

    const serviceSummary = await getJson("/service.json")
    check(
      serviceSummary.endpoints?.verify === "POST /verify",
      "service.json preserves machine-readable summary"
    )

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
      verifySchema.required?.includes("risk_factors"),
      "verify-result schema requires risk_factors"
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
    check(
      receiptSchema.required?.includes("risk_factors"),
      "trust receipt schema exposes risk factors"
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
    check(
      pricing.pricing?.protocols?.x402?.accepts?.[0]?.scheme === "exact",
      "pricing exposes x402 exact accepts"
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

    const wellKnownAlias = await getJson("/.well-known/ai-risk-oracle")
    check(
      wellKnownAlias.id === "interai-risk-oracle",
      "ai-risk-oracle well-known alias resolves"
    )

    const openapiAlias = await getJson("/openapi.json")
    check(openapiAlias.openapi === "3.0.3", "openapi alias resolves")

    const discoveryAlias = await getJson("/discovery.json")
    check(
      discoveryAlias.service?.id === "interai-risk-oracle",
      "discovery alias resolves"
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
