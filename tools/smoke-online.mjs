const base = (process.env.BASE_URL || "https://ai-risk-oracle.fly.dev").replace(
  /\/$/,
  ""
)

function assert(condition, message, payload) {
  if (!condition) {
    console.error(`ONLINE SMOKE FAILED: ${message}`)
    if (payload !== undefined) {
      console.error(JSON.stringify(payload, null, 2))
    }
    process.exit(1)
  }
}

async function request(path, options = {}) {
  const res = await fetch(`${base}${path}`, {
    ...options,
    headers: {
      ...(options.body ? { "content-type": "application/json" } : {}),
      ...(options.headers || {})
    }
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
    headers: res.headers,
    json
  }
}

async function getJson(path) {
  return request(path)
}

async function postJson(path, body, headers = {}) {
  return request(path, {
    method: "POST",
    body: JSON.stringify(body),
    headers
  })
}

async function main() {
  const health = await getJson("/health")
  assert(health.status === 200, "/health should be 200", health.json)
  assert(health.json?.ok === true, "/health should return ok=true", health.json)

  const ready = await getJson("/ready")
  assert(ready.status === 200, "/ready should be 200", ready.json)
  assert(ready.json?.ready === true, "/ready should return ready=true", ready.json)
  assert(ready.json?.checks?.database === true, "/ready database check failed", ready.json)
  assert(ready.json?.checks?.signing === true, "/ready signing check failed", ready.json)
  assert(
    ready.json?.checks?.onchain_payment_config === true,
    "/ready onchain config check failed",
    ready.json
  )

  const pricing = await getJson("/pricing")
  assert(pricing.status === 200, "/pricing should be 200", pricing.json)
  assert(
    pricing.json?.pricing?.verify?.modes?.fast_heuristic,
    "pricing missing fast_heuristic",
    pricing.json
  )
  assert(
    pricing.json?.pricing?.verify?.modes?.semantic_judge,
    "pricing missing semantic_judge",
    pricing.json
  )
  assert(
    pricing.json?.pricing?.protocols?.x402?.accepts?.length > 0,
    "pricing missing x402 accepts metadata",
    pricing.json
  )

  const service = await getJson("/.well-known/ai-service.json")
  assert(service.status === 200, "service descriptor should be 200", service.json)
  assert(service.json?.id === "interai-risk-oracle", "service descriptor id mismatch", service.json)

  const agent = await getJson("/.well-known/agent.json")
  assert(agent.status === 200, "agent card should be 200", agent.json)
  assert(agent.json?.url?.endsWith("/a2a"), "agent card missing A2A url", agent.json)
  assert(Array.isArray(agent.json?.skills), "agent card missing skills", agent.json)

  const bundle = await getJson("/.well-known/discovery-bundle.json")
  assert(bundle.status === 200, "discovery bundle should be 200", bundle.json)
  assert(bundle.json?.interfaces?.mcp?.endpoint, "discovery bundle missing MCP endpoint", bundle.json)
  assert(bundle.json?.interfaces?.a2a?.endpoint, "discovery bundle missing A2A endpoint", bundle.json)

  const verifySchema = await getJson("/schemas/verify-result.json")
  assert(verifySchema.status === 200, "verify result schema should be 200", verifySchema.json)
  assert(
    verifySchema.json?.title === "AI Risk Oracle Verify Result",
    "verify result schema title mismatch",
    verifySchema.json
  )

  const publicReceiptSchema = await getJson("/schemas/trust-receipt-public.json")
  assert(
    publicReceiptSchema.status === 200,
    "public trust receipt schema should be 200",
    publicReceiptSchema.json
  )
  assert(
    publicReceiptSchema.json?.title === "AI Risk Oracle Public Trust Receipt Lookup",
    "public trust receipt schema title mismatch",
    publicReceiptSchema.json
  )

  const verifyPaymentRequired = await postJson("/verify", {
    prompt: "What is 2 + 2?",
    response: "4",
    domain: "math"
  })
  assert(
    verifyPaymentRequired.status === 402,
    "/verify without auth should return 402",
    verifyPaymentRequired.json
  )
  assert(
    verifyPaymentRequired.json?.x402Version === 2,
    "/verify 402 should expose x402 v2 metadata",
    verifyPaymentRequired.json
  )
  assert(
    verifyPaymentRequired.headers.has("payment-required") ||
      verifyPaymentRequired.headers.has("x-payment-required"),
    "/verify 402 should include payment requirement headers"
  )

  const mcpInitialize = await postJson("/mcp", {
    jsonrpc: "2.0",
    id: "online-smoke-mcp-init",
    method: "initialize",
    params: {
      protocolVersion: "2025-11-25",
      capabilities: {},
      clientInfo: {
        name: "online-smoke",
        version: "1.0.0"
      }
    }
  })
  assert(mcpInitialize.status === 200, "MCP initialize should be 200", mcpInitialize.json)
  assert(
    mcpInitialize.json?.result?.serverInfo?.name === "interai-risk-oracle",
    "MCP initialize serverInfo mismatch",
    mcpInitialize.json
  )

  const mcpTools = await postJson("/mcp", {
    jsonrpc: "2.0",
    id: "online-smoke-mcp-tools",
    method: "tools/list"
  })
  assert(mcpTools.status === 200, "MCP tools/list should be 200", mcpTools.json)
  assert(
    mcpTools.json?.result?.tools?.some((tool) => tool.name === "oracle.verify_response"),
    "MCP tools/list missing oracle.verify_response",
    mcpTools.json
  )

  const a2aUnauthorized = await postJson("/a2a", {
    jsonrpc: "2.0",
    id: "online-smoke-a2a",
    method: "message/send",
    params: {
      message: {
        role: "user",
        messageId: "online-smoke-message",
        parts: [
          {
            kind: "data",
            data: {
              prompt: "What is 2 + 2?",
              response: "4",
              domain: "math"
            }
          }
        ]
      }
    }
  })
  assert(a2aUnauthorized.status === 200, "A2A unauthenticated call should be JSON-RPC 200", a2aUnauthorized.json)
  assert(
    a2aUnauthorized.json?.error?.data?.error === "payment_required",
    "A2A unauthenticated call should require payment",
    a2aUnauthorized.json
  )

  console.log(`ONLINE SMOKE OK ${base}`)
}

main().catch((error) => {
  console.error("ONLINE SMOKE FAILED")
  console.error(error)
  process.exit(1)
})
