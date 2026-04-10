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
  console.log(`Running topup confirm smoke against ${BASE_URL}\n`)

  // onboard limpio
  const onboard = await http("POST", "/onboard")
  assert(onboard.ok, "POST /onboard responde OK", onboard.json)

  const apiKey = onboard.json?.api_key
  assert(!!apiKey, "onboard devuelve api_key", onboard.json)

  // topup #1
  const topup1 = await http("POST", "/topup/create", {
    headers: {
      Authorization: `Bearer ${apiKey}`
    },
    body: {
      amount: "0.01"
    }
  })
  assert(topup1.ok, "primer topup/create responde OK", topup1.json)

  const topupId1 = topup1.json?.topup_id
  assert(!!topupId1, "primer topup devuelve topup_id", topup1.json)

  const randomPart = `${Date.now().toString(16)}${Math.random().toString(16).slice(2)}`
  const fakeTx = `0x${randomPart.padEnd(64, "0").slice(0, 64)}`

  // confirm normal
  const confirm1 = await http("POST", "/topup/confirm", {
    headers: {
      "X-Topup-Id": topupId1,
      "X-Tx-Hash": fakeTx,
      "X-Test-Confirm": "true"
    }
  })
  assert(confirm1.ok, "primer topup/confirm responde OK", confirm1.json)
  assert(confirm1.json?.ok === true, "primer confirm devuelve ok=true", confirm1.json)
  assert(confirm1.json?.already_confirmed === false, "primer confirm no estaba confirmado", confirm1.json)
  assert(confirm1.json?.credited_usdc === "0.01", "primer confirm acredita 0.01 USDC", confirm1.json)

  // retry del mismo confirm
  const confirmRetry = await http("POST", "/topup/confirm", {
    headers: {
      "X-Topup-Id": topupId1,
      "X-Tx-Hash": fakeTx,
      "X-Test-Confirm": "true"
    }
  })
  assert(confirmRetry.ok, "retry del confirm responde OK", confirmRetry.json)
  assert(confirmRetry.json?.already_confirmed === true, "retry devuelve already_confirmed=true", confirmRetry.json)

  // verificar balance después del retry
  const meAfterRetry = await http("GET", "/me", {
    headers: {
      Authorization: `Bearer ${apiKey}`
    }
  })
  assert(meAfterRetry.ok, "GET /me luego del retry responde OK", meAfterRetry.json)
  assert(
    meAfterRetry.json?.balance?.balance_usdc === "0.010000",
    "balance queda en 0.010000 luego del retry",
    meAfterRetry.json
  )

  // topup #2
  const topup2 = await http("POST", "/topup/create", {
    headers: {
      Authorization: `Bearer ${apiKey}`
    },
    body: {
      amount: "0.01"
    }
  })
  assert(topup2.ok, "segundo topup/create responde OK", topup2.json)

  const topupId2 = topup2.json?.topup_id
  assert(!!topupId2, "segundo topup devuelve topup_id", topup2.json)

  // reuse malicioso de la misma tx
  const confirmReuse = await http("POST", "/topup/confirm", {
    headers: {
      "X-Topup-Id": topupId2,
      "X-Tx-Hash": fakeTx,
      "X-Test-Confirm": "true"
    }
  })
  assert(confirmReuse.status === 409, "reuse de tx devuelve 409", confirmReuse.json)
  assert(
    confirmReuse.json?.error === "topup_tx_already_used",
    "reuse devuelve topup_tx_already_used",
    confirmReuse.json
  )

  // balance final debe seguir igual
  const meFinal = await http("GET", "/me", {
    headers: {
      Authorization: `Bearer ${apiKey}`
    }
  })
  assert(meFinal.ok, "GET /me final responde OK", meFinal.json)
  assert(
    meFinal.json?.balance?.balance_usdc === "0.010000",
    "balance final sigue en 0.010000",
    meFinal.json
  )

  console.log("\nSmoke de topup confirm completado correctamente.")
}

main().catch((error) => {
  console.error("\n[UNCAUGHT ERROR]")
  console.error(error)
  process.exit(1)
})