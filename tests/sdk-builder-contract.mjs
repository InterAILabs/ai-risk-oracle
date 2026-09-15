import assert from "node:assert/strict"
import {
  InterAIRiskOracleClient,
  OracleHttpError,
  SDK_VERSION
} from "../sdk/typescript/dist/index.js"

const originalFetch = globalThis.fetch
const captured = []

globalThis.fetch = async (url, init = {}) => {
  const path = new URL(url).pathname
  captured.push({ url, init })

  if (path === "/onboard") {
    return new Response(JSON.stringify({ ok: true, api_key: "builder-key" }), {
      status: 200,
      headers: { "content-type": "application/json" }
    })
  }
  if (path === "/pricing") {
    return new Response(JSON.stringify({ error: "service_unavailable" }), {
      status: 503,
      headers: { "content-type": "application/json" }
    })
  }
  if (path === "/topup/create") {
    return new Response(JSON.stringify({ ok: true, topup_id: "topup-1" }), { status: 200 })
  }
  if (path === "/topup/topup-1") {
    return new Response(JSON.stringify({ ok: true, status: "pending" }), { status: 200 })
  }
  if (path === "/topup/confirm") {
    return new Response(JSON.stringify({ ok: true, status: "confirmed" }), { status: 200 })
  }
  if (path === "/verify") {
    return new Response(JSON.stringify({
      decision_id: "decision-1",
      request_contract: "autonomous_execution",
      score: 0.99,
      risk_level: "low",
      signals: {},
      recommended_action: "allow",
      policy_result: "allow",
      policy_violations: []
    }), { status: 200 })
  }
  return new Response(JSON.stringify({ ok: true }), { status: 200 })
}

try {
  assert.equal(SDK_VERSION, "0.1.5-beta")

  const client = new InterAIRiskOracleClient({
    baseUrl: "https://interai.invalid/",
    timeoutMs: 500
  })

  await client.onboard({ name: "builder-test" })
  assert.equal(client.apiKey, "builder-key")

  await client.me()
  const meRequest = captured.at(-1)
  assert.equal(meRequest.init.headers.authorization, "Bearer builder-key")
  assert.equal(meRequest.init.headers["x-interai-client"], `typescript-sdk/${SDK_VERSION}`)

  await client.createTopup("0.10")
  const createBody = JSON.parse(captured.at(-1).init.body)
  assert.equal(createBody.amount_usdc, "0.10")

  await client.topupStatus("topup-1")
  assert.equal(new URL(captured.at(-1).url).pathname, "/topup/topup-1")

  await client.confirmTopup("topup-1", "0xabc")
  const confirmHeaders = captured.at(-1).init.headers
  assert.equal(confirmHeaders["X-Topup-Id"], "topup-1")
  assert.equal(confirmHeaders["X-Tx-Hash"], "0xabc")
  assert.equal(confirmHeaders.authorization, "Bearer builder-key")

  await client.verify({
    use_case: "builder-contract",
    action: {
      schema: "interai-canonical-action/v1",
      tool_id: "payments.transfer",
      type: "payment",
      operation: "transfer",
      arguments: { amount: "10" },
      external_side_effect: true,
      irreversible: true
    },
    execution_context: {
      schema: "interai-host-execution-context/v1",
      workspace_id: "workspace-1",
      environment: "sandbox"
    },
    authorization_ttl_seconds: 30,
    external_evidence: [{ source: "test" }]
  }, "stable-builder-key")
  const verifyRequest = captured.at(-1)
  const verifyBody = JSON.parse(verifyRequest.init.body)
  assert.equal(verifyRequest.init.headers["x-idempotency-key"], "stable-builder-key")
  assert.equal(verifyBody.execution_context.workspace_id, "workspace-1")
  assert.equal(verifyBody.authorization_ttl_seconds, 30)
  assert.deepEqual(verifyBody.external_evidence, [{ source: "test" }])

  await assert.rejects(
    client.getPricing(),
    error => error instanceof OracleHttpError &&
      error.status === 503 &&
      error.code === "service_unavailable"
  )

  globalThis.fetch = async (_url, init = {}) => new Promise((_resolve, reject) => {
    init.signal.addEventListener("abort", () => reject(init.signal.reason), { once: true })
  })
  await assert.rejects(
    client.verify({
      use_case: "timeout-test",
      action: { type: "lookup", description: "lookup" }
    }, "timeout-key", { timeoutMs: 5 }),
    /timed out/
  )
} finally {
  globalThis.fetch = originalFetch
}

console.log("[OK] public TypeScript builder contract")
