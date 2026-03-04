const BASE = process.env.ORACLE_URL || "http://localhost:3000"

async function post(path, body, headers = {}) {
  const res = await fetch(`${BASE}${path}`, {
    method: "POST",
    headers: { "content-type": "application/json", ...headers },
    body: JSON.stringify(body)
  })
  const text = await res.text()
  let json
  try { json = JSON.parse(text) } catch { json = text }
  return { status: res.status, json }
}

async function get(path) {
  const res = await fetch(`${BASE}${path}`)
  const text = await res.text()
  let json
  try { json = JSON.parse(text) } catch { json = text }
  return { status: res.status, json }
}

function assert(cond, msg) {
  if (!cond) throw new Error(msg)
}

console.log("Smoke against:", BASE)

const h = await get("/health")
assert(h.status === 200, "health should be 200")
console.log("health OK")

const q = await post("/quote", { prompt: "x", response: "y", mode: "fast" })
assert(q.status === 200, "quote should be 200")
assert(q.json.payment_reference, "quote must return payment_reference")
console.log("quote OK", q.json.payment_reference)

const ref = q.json.payment_reference

// verify should 402 (payments required)
const v0 = await post("/verify", {
  prompt: "What is the capital of France?",
  response: "Paris is the capital of France.",
  domain: "general"
}, { "X-Payment-Ref": ref })
assert(v0.status === 402, "verify should be 402 before payment")
console.log("verify 402 OK")

// confirm payment (only in file mode)
const ADMIN_TOKEN = process.env.ADMIN_TOKEN || ""
if (!ADMIN_TOKEN) throw new Error("Set ADMIN_TOKEN env var to run smoke (file-mode confirm).")

const pc = await post("/pay/confirm", { payment_reference: ref }, { "X-Admin-Token": ADMIN_TOKEN })
assert(pc.status === 200, "pay/confirm should be 200 in file mode")
console.log("pay confirm OK")

// verify should 200 now
const v1 = await post("/verify", {
  prompt: "What is the capital of France?",
  response: "Paris is the capital of France.",
  domain: "general"
}, { "X-Payment-Ref": ref })
assert(v1.status === 200, "verify should be 200 after payment")
console.log("verify OK", v1.json.risk_level, v1.json.consistency_score)

console.log("SMOKE PASS ✅")