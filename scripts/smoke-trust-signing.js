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

async function importFreshServerModule() {
  const url = new URL(`../dist/server.js?ts=${Date.now()}`, import.meta.url)
  return import(url.href)
}

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

async function main() {
  const previousSecret = process.env.ORACLE_SIGNING_SECRET
  const previousDevTopup = process.env.DEV_TOPUP_ENABLED
  const previousDbFile = process.env.PAYMENTS_DB_FILE
  const tempDir = (await import("fs")).mkdtempSync(
    (await import("path")).join((await import("os")).tmpdir(), "ai-risk-oracle-trust-")
  )
  process.env.ORACLE_SIGNING_SECRET = "local-test-signing-secret"
  process.env.DEV_TOPUP_ENABLED = "true"
  process.env.PAYMENTS_DB_FILE = (await import("path")).join(tempDir, "payments.db")

  const { createApp } = await importFreshServerModule()
  const app = await createApp()

  try {
    console.log("Running trust signing smoke with Fastify.inject()\n")

    const onboard = await http(app, "POST", "/onboard")
    assert(onboard.ok, "POST /onboard responde OK", onboard.json)

    const apiKey = onboard.json?.api_key
    assert(!!apiKey, "onboard devuelve api_key", onboard.json)

    const topup = await http(app, "POST", "/topup/dev/credit", {
      headers: {
        Authorization: `Bearer ${apiKey}`
      },
      body: {
        amount_usdc: "0.01"
      }
    })
    assert(topup.ok, "POST /topup/dev/credit responde OK", topup.json)

    const verify = await http(app, "POST", "/verify", {
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "X-Idempotency-Key": `trust-signing-${Date.now()}`
      },
      body: {
        prompt: "What is the capital of Argentina?",
        response: "Buenos Aires",
        domain: "general"
      }
    })
    assert(verify.ok, "POST /verify responde OK", verify.json)
    assert(verify.json?.trust_receipt?.signed === true, "verify devuelve trust receipt firmado", verify.json)
    assert(verify.json?.oracle?.trust_signing_enabled === true, "oracle informa signing enabled", verify.json)

    const trustReceipt = verify.json?.trust_receipt
    const publicReceipt = await http(app, "GET", `/trust/receipts/${trustReceipt.receipt_id}`)
    assert(publicReceipt.ok, "GET /trust/receipts/:receiptId responde OK", publicReceipt.json)
    assert(publicReceipt.json?.receipt?.receipt_id === trustReceipt.receipt_id, "lookup publico devuelve el receipt correcto", publicReceipt.json)

    const signatureCheck = await http(app, "POST", "/trust/verify-signature", {
      body: {
        receipt: publicReceipt.json?.receipt,
        signature: publicReceipt.json?.verification?.signature,
        signature_alg: publicReceipt.json?.verification?.signature_alg
      }
    })
    assert(signatureCheck.ok, "POST /trust/verify-signature responde OK", signatureCheck.json)
    assert(signatureCheck.json?.valid === true, "la firma del receipt valida correctamente", signatureCheck.json)

    const tampered = await http(app, "POST", "/trust/verify-signature", {
      body: {
        receipt: {
          receipt_id: publicReceipt.json?.receipt?.receipt_id,
          issued_at: publicReceipt.json?.receipt?.issued_at,
          oracle_version: publicReceipt.json?.receipt?.oracle_version,
          signals_version: publicReceipt.json?.receipt?.signals_version,
          request_hash: `${trustReceipt.request_hash}00`,
          decision_basis: publicReceipt.json?.receipt?.decision_basis
        },
        signature: publicReceipt.json?.verification?.signature,
        signature_alg: publicReceipt.json?.verification?.signature_alg
      }
    })
    assert(tampered.ok, "tampered signature check responde OK", tampered.json)
    assert(tampered.json?.valid === false, "un receipt alterado invalida la firma", tampered.json)

    console.log("\nSmoke de trust signing completado correctamente.")
  } finally {
    await app.close()

    if (previousSecret == null) {
      delete process.env.ORACLE_SIGNING_SECRET
    } else {
      process.env.ORACLE_SIGNING_SECRET = previousSecret
    }

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
