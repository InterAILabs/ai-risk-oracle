import fs from "fs"
import os from "os"
import path from "path"

function assert(condition, message, payload) {
  if (!condition) {
    console.error(`SMOKE TEST FAILED: ${message}`)
    if (payload !== undefined) {
      console.error(JSON.stringify(payload, null, 2))
    }
    process.exit(1)
  }
}

async function getJson(app, path, headers = {}) {
  const res = await app.inject({
    method: "GET",
    url: path,
    headers
  })

  let json = null

  try {
    json = res.json()
  } catch {
    json = { raw: res.body }
  }

  return { status: res.statusCode, json }
}

async function postJson(app, path, body) {
  const res = await app.inject({
    method: "POST",
    url: path,
    headers: {
      "Content-Type": "application/json"
    },
    payload: body
  })

  let json = null

  try {
    json = res.json()
  } catch {
    json = { raw: res.body }
  }

  return { status: res.statusCode, json }
}

async function main() {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "ai-risk-oracle-smoke-"))
  const previousDbFile = process.env.PAYMENTS_DB_FILE
  process.env.PAYMENTS_DB_FILE = path.join(tempDir, "payments.db")

  const { createApp } = await import("../dist/server.js")
  const app = await createApp()

  try {
    const health = await getJson(app, "/health")
    assert(health.status === 200, "health should be 200", health.json)
    assert(health.json?.ok === true, "health should return ok=true", health.json)

    const openapi = await getJson(app, "/.well-known/openapi.json")
    assert(openapi.status === 200, "openapi should be 200", openapi.json)
    assert(openapi.json?.openapi, "openapi payload missing", openapi.json)

    const discovery = await getJson(app, "/.well-known/ai-service.json")
    assert(discovery.status === 200, "ai-service should be 200", discovery.json)
    assert(discovery.json?.id, "ai-service id missing", discovery.json)

    const root = await getJson(app, "/")
    assert(root.status === 200, "root should be 200", root.json)
    assert(root.json?.trust?.receipts === true, "root should advertise trust receipts", root.json)

    const trustReceiptSchema = await getJson(app, "/schemas/trust-receipt.json")
    assert(trustReceiptSchema.status === 200, "trust receipt schema should be 200", trustReceiptSchema.json)
    assert(trustReceiptSchema.json?.title === "AI Risk Oracle Trust Receipt", "trust receipt schema title should match", trustReceiptSchema.json)

    const verifySchema = await getJson(app, "/schemas/verify-result.json")
    assert(verifySchema.status === 200, "verify result schema should be 200", verifySchema.json)
    assert(verifySchema.json?.title === "AI Risk Oracle Verify Result", "verify result schema title should match", verifySchema.json)

    const unsignedVerify = await postJson(app, "/trust/verify-signature", {
      receipt: { receipt_id: "demo" },
      signature: "abcd",
      signature_alg: "hmac-sha256"
    })
    assert(unsignedVerify.status === 503, "signature verify should report not configured when secret is missing", unsignedVerify.json)

    console.log("SMOKE TEST OK")
  } finally {
    await app.close()
    if (previousDbFile == null) {
      delete process.env.PAYMENTS_DB_FILE
    } else {
      process.env.PAYMENTS_DB_FILE = previousDbFile
    }
  }
}

main().catch((err) => {
  console.error("SMOKE TEST FAILED")
  console.error(err)
  process.exit(1)
})
