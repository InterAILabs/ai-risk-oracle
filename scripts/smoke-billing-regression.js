const BASE_URL = process.env.BASE_URL || "http://localhost:3000"

async function http(method, path, { headers = {}, body } = {}) {
  const res = await fetch(`${BASE_URL}${path}`, {
    method,
    headers: {
      ...headers,
      ...(body ? { "Content-Type": "application/json" } : {})
    },
    body: body ? JSON.stringify(body) : undefined
  })

  const text = await res.text()
  let json = null

  try {
    json = text ? JSON.parse(text) : null
  } catch {
    json = { raw: text }
  }

  return {
    status: res.status,
    ok: res.ok,
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
  console.log(`Running billing regression smoke against ${BASE_URL}\n`)

  // 1) onboard
  const onboard = await http("POST", "/onboard")
  assert(onboard.ok, "POST /onboard responde OK", onboard.json)

  const apiKey = onboard.json?.api_key
  assert(!!apiKey, "onboard devuelve api_key", onboard.json)

  const dev = onboard.json?.dev ?? {}
  assert(dev.auto_credit_enabled === false, "auto credit dev está apagado", dev)
  assert(dev.auto_credit_applied === false, "auto credit dev no fue aplicado", dev)

  // 2) /me debe arrancar en cero
  const me = await http("GET", "/me", {
    headers: {
      Authorization: `Bearer ${apiKey}`
    }
  })
  assert(me.ok, "GET /me responde OK", me.json)

  const balanceUsdc = me.json?.balance?.balance_usdc
  assert(balanceUsdc === "0.000000", "balance inicial es 0.000000 USDC", me.json)

  // 3) crear topup
  const topupCreate = await http("POST", "/topup/create", {
    headers: {
      Authorization: `Bearer ${apiKey}`
    },
    body: {
      amount: "0.01"
    }
  })
  assert(topupCreate.ok, "POST /topup/create responde OK", topupCreate.json)

  const topupId = topupCreate.json?.topup_id
  assert(!!topupId, "topup/create devuelve topup_id", topupCreate.json)

  // 4) topup status sin auth -> 401
  const topupNoAuth = await http("GET", `/topup/${topupId}`)
  assert(topupNoAuth.status === 401, "GET /topup/:id sin auth devuelve 401", topupNoAuth.json)

  // 5) topup status con auth correcta -> 200
  const topupWithAuth = await http("GET", `/topup/${topupId}`, {
    headers: {
      Authorization: `Bearer ${apiKey}`
    }
  })
  assert(topupWithAuth.status === 200, "GET /topup/:id con auth válida devuelve 200", topupWithAuth.json)

  // 6) otra cuenta no debe ver ese topup
  const onboard2 = await http("POST", "/onboard")
  assert(onboard2.ok, "segundo onboard responde OK", onboard2.json)

  const apiKey2 = onboard2.json?.api_key
  assert(!!apiKey2, "segundo onboard devuelve api_key", onboard2.json)

  const topupOtherAccount = await http("GET", `/topup/${topupId}`, {
    headers: {
      Authorization: `Bearer ${apiKey2}`
    }
  })
  assert(
    topupOtherAccount.status === 404,
    "otra cuenta no puede ver el topup ajeno",
    topupOtherAccount.json
  )

  console.log("\nSmoke de billing/auth completado correctamente.")
}

main().catch((error) => {
  console.error("\n[UNCAUGHT ERROR]")
  console.error(error)
  process.exit(1)
})