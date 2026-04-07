const baseUrl = process.env.ORACLE_BASE_URL || "http://localhost:3000"

async function call(path, init = {}) {
  const r = await fetch(`${baseUrl}${path}`, init)
  const txt = await r.text()

  let data
  try {
    data = JSON.parse(txt)
  } catch {
    data = { raw: txt }
  }

  return {
    ok: r.ok,
    status: r.status,
    data
  }
}

async function main() {
  console.log("1) onboard")
  const onboard = await call("/onboard", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ name: "local-smoke-agent" })
  })
  console.log(JSON.stringify(onboard, null, 2))

  if (!onboard.ok) process.exit(1)

  const apiKey = onboard.data.api_key

  console.log("\n2) me")
  const me = await call("/me", {
    method: "GET",
    headers: {
      Authorization: `Bearer ${apiKey}`
    }
  })
  console.log(JSON.stringify(me, null, 2))

  console.log("\n3) dev credit")
  const credit = await call("/topup/dev/credit", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      Authorization: `Bearer ${apiKey}`
    },
    body: JSON.stringify({ amount_usdc: "0.01" })
  })
  console.log(JSON.stringify(credit, null, 2))

  if (!credit.ok) process.exit(1)

  console.log("\n4) verify")
  const verify = await call("/verify", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      Authorization: `Bearer ${apiKey}`,
      "X-Idempotency-Key": "smoke-local-1"
    },
    body: JSON.stringify({
      prompt: "What is the capital of France?",
      response: "Paris",
      domain: "general"
    })
  })
  console.log(JSON.stringify(verify, null, 2))

  if (!verify.ok) process.exit(1)

  console.log("\n5) verify batch")
  const batch = await call("/verify/batch", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      Authorization: `Bearer ${apiKey}`,
      "X-Idempotency-Key": "smoke-local-batch-1"
    },
    body: JSON.stringify({
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
    })
  })
  console.log(JSON.stringify(batch, null, 2))

  if (!batch.ok) process.exit(1)

  console.log("\nDone.")
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})