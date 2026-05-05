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
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "ai-risk-oracle-billing-"))
  const previousDbFile = process.env.PAYMENTS_DB_FILE
  process.env.PAYMENTS_DB_FILE = path.join(tempDir, "payments.db")

  const { createApp } = await import("../dist/server.js")
  const app = await createApp()

  try {
    console.log("Running billing regression smoke with Fastify.inject()\n")

    const onboard = await http(app, "POST", "/onboard")
    assert(onboard.ok, "POST /onboard responde OK", onboard.json)

    const apiKey = onboard.json?.api_key
    assert(!!apiKey, "onboard devuelve api_key", onboard.json)

    const dev = onboard.json?.dev ?? {}
    assert(dev.auto_credit_enabled === false, "auto credit dev esta apagado", dev)
    assert(dev.auto_credit_applied === false, "auto credit dev no fue aplicado", dev)

    const me = await http(app, "GET", "/me", {
      headers: {
        Authorization: `Bearer ${apiKey}`
      }
    })
    assert(me.ok, "GET /me responde OK", me.json)
    assert(me.json?.balance?.balance_usdc === "0.000000", "balance inicial es 0.000000 USDC", me.json)

    const topupCreate = await http(app, "POST", "/topup/create", {
      headers: {
        Authorization: `Bearer ${apiKey}`
      },
      body: {
        amount_usdc: "0.01"
      }
    })
    assert(topupCreate.ok, "POST /topup/create responde OK", topupCreate.json)

    const topupId = topupCreate.json?.topup_id
    assert(!!topupId, "topup/create devuelve topup_id", topupCreate.json)

    const topupNoAuth = await http(app, "GET", `/topup/${topupId}`)
    assert(topupNoAuth.status === 401, "GET /topup/:id sin auth devuelve 401", topupNoAuth.json)

    const topupWithAuth = await http(app, "GET", `/topup/${topupId}`, {
      headers: {
        Authorization: `Bearer ${apiKey}`
      }
    })
    assert(topupWithAuth.status === 200, "GET /topup/:id con auth valida devuelve 200", topupWithAuth.json)

    const onboard2 = await http(app, "POST", "/onboard")
    assert(onboard2.ok, "segundo onboard responde OK", onboard2.json)

    const apiKey2 = onboard2.json?.api_key
    assert(!!apiKey2, "segundo onboard devuelve api_key", onboard2.json)

    const topupOtherAccount = await http(app, "GET", `/topup/${topupId}`, {
      headers: {
        Authorization: `Bearer ${apiKey2}`
      }
    })
    assert(topupOtherAccount.status === 404, "otra cuenta no puede ver el topup ajeno", topupOtherAccount.json)

    const fakeTx = `0x${`${Date.now().toString(16)}${Math.random().toString(16).slice(2)}`.padEnd(64, "0").slice(0, 64)}`
    const topupConfirm = await http(app, "POST", "/topup/confirm", {
      headers: {
        "X-Topup-Id": topupId,
        "X-Tx-Hash": fakeTx,
        "X-Test-Confirm": "true"
      }
    })
    assert(topupConfirm.ok, "POST /topup/confirm responde OK", topupConfirm.json)
    assert(topupConfirm.json?.credited_usdc === "0.01", "el topup acredita 0.01 USDC", topupConfirm.json)

    const verify = await http(app, "POST", "/verify", {
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "X-Idempotency-Key": `billing-smoke-${Date.now()}`
      },
      body: {
        prompt: "What is the capital of France?",
        response: "Paris",
        domain: "general"
      }
    })
    assert(verify.ok, "POST /verify responde OK", verify.json)
    assert(typeof verify.json?.trust_score === "number", "verify devuelve trust_score", verify.json)
    assert(verify.json?.trust_receipt?.receipt_id, "verify devuelve trust_receipt", verify.json)

    const verifyBatch = await http(app, "POST", "/verify/batch", {
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "X-Idempotency-Key": `billing-smoke-batch-${Date.now()}`
      },
      body: {
        items: [
          {
            prompt: "What is the capital of France?",
            response: "Paris",
            domain: "general"
          },
          {
            prompt: "2 + 2 = ?",
            response: "4",
            domain: "general"
          }
        ]
      }
    })
    assert(verifyBatch.ok, "POST /verify/batch responde OK", verifyBatch.json)
    assert(Array.isArray(verifyBatch.json?.results), "verify/batch devuelve results", verifyBatch.json)
    assert(verifyBatch.json?.results?.[0]?.trust_receipt?.receipt_id, "verify/batch agrega trust_receipt por item", verifyBatch.json)

    const receipts = await http(app, "GET", "/trust/receipts?limit=10", {
      headers: {
        Authorization: `Bearer ${apiKey}`
      }
    })
    assert(receipts.ok, "GET /trust/receipts responde OK", receipts.json)
    assert(Array.isArray(receipts.json?.receipts), "trust/receipts devuelve array", receipts.json)
    assert(receipts.json?.receipts?.length >= 3, "trust/receipts devuelve receipts de verify y verify/batch", receipts.json)

    console.log("\nSmoke de billing/auth completado correctamente.")
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
  console.error("\n[UNCAUGHT ERROR]")
  console.error(error)
  process.exit(1)
})
