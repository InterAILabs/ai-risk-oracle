import fs from "fs"
import os from "os"
import path from "path"

async function http(app, method, path, { headers = {}, body } = {}) {
  const res = await app.inject({
    method,
    url: path,
    headers,
    payload: body
  })

  let json = null

  try {
    json = res.json()
  } catch {
    json = { raw: res.body }
  }

  return {
    status: res.statusCode,
    ok: res.statusCode >= 200 && res.statusCode < 300,
    headers: res.headers,
    json
  }
}

function assert(condition, message, payload) {
  if (!condition) {
    console.error(`\n[FAIL] ${message}`)
    if (payload !== undefined) {
      console.error(JSON.stringify(payload, null, 2))
    }
    process.exit(1)
  }
  console.log(`[OK] ${message}`)
}

async function main() {
  const previousDevTopup = process.env.DEV_TOPUP_ENABLED
  const previousDbFile = process.env.PAYMENTS_DB_FILE
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "ai-risk-oracle-idempotency-"))
  process.env.DEV_TOPUP_ENABLED = "true"
  process.env.PAYMENTS_DB_FILE = path.join(tempDir, "payments.db")

  const { createApp } = await import("../dist/server.js")
  const app = await createApp()

  try {
    console.log("Running idempotency smoke with Fastify.inject()\n")

    const onboard = await http(app, "POST", "/onboard")
    assert(onboard.ok, "POST /onboard responde OK", onboard.json)

    const apiKey = onboard.json?.api_key
    assert(!!apiKey, "onboard devuelve api_key", onboard.json)

    const topup = await http(app, "POST", "/topup/dev/credit", {
      headers: {
        Authorization: `Bearer ${apiKey}`
      },
      body: {
        amount_usdc: "0.02"
      }
    })
    assert(topup.ok, "POST /topup/dev/credit responde OK", topup.json)

    const verifyKey = `verify-idempotency-${Date.now()}`
    const verifyPayload = {
      prompt: "What is the capital of France?",
      response: "Paris",
      domain: "general"
    }

    const verify1 = await http(app, "POST", "/verify", {
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "X-Idempotency-Key": verifyKey
      },
      body: verifyPayload
    })
    assert(verify1.ok, "primer verify responde OK", verify1.json)
    assert(!verify1.headers["x-oracle-idempotent-replay"], "primer verify no marca replay", verify1.headers)

    const verify2 = await http(app, "POST", "/verify", {
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "X-Idempotency-Key": verifyKey
      },
      body: verifyPayload
    })
    assert(verify2.ok, "segundo verify responde OK", verify2.json)
    assert(verify2.headers["x-oracle-idempotent-replay"] === "true", "segundo verify marca replay", verify2.headers)

    const meAfterVerify = await http(app, "GET", "/me", {
      headers: {
        Authorization: `Bearer ${apiKey}`
      }
    })
    assert(meAfterVerify.ok, "GET /me luego de verify responde OK", meAfterVerify.json)
    assert(meAfterVerify.json?.balance?.balance_usdc === "0.019400", "verify idempotente debita una sola vez", meAfterVerify.json)

    const batchKey = `batch-idempotency-${Date.now()}`
    const batchPayload = {
      items: [
        { prompt: "2 + 2 = ?", response: "4", domain: "general" },
        { prompt: "Capital of Spain?", response: "Madrid", domain: "general" }
      ]
    }

    const batch1 = await http(app, "POST", "/verify/batch", {
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "X-Idempotency-Key": batchKey
      },
      body: batchPayload
    })
    assert(batch1.ok, "primer verify/batch responde OK", batch1.json)
    assert(!batch1.headers["x-oracle-idempotent-replay"], "primer verify/batch no marca replay", batch1.headers)

    const batch2 = await http(app, "POST", "/verify/batch", {
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "X-Idempotency-Key": batchKey
      },
      body: batchPayload
    })
    assert(batch2.ok, "segundo verify/batch responde OK", batch2.json)
    assert(batch2.headers["x-oracle-idempotent-replay"] === "true", "segundo verify/batch marca replay", batch2.headers)

    const meFinal = await http(app, "GET", "/me", {
      headers: {
        Authorization: `Bearer ${apiKey}`
      }
    })
    assert(meFinal.ok, "GET /me final responde OK", meFinal.json)
    assert(meFinal.json?.balance?.balance_usdc === "0.018400", "verify/batch idempotente debita una sola vez", meFinal.json)

    console.log("\nSmoke de idempotency completado correctamente.")
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
  console.error("\n[UNCAUGHT ERROR]")
  console.error(error)
  process.exit(1)
})
