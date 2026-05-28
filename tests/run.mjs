import assert from "node:assert/strict"
import fs from "node:fs"
import nodeHttp from "node:http"
import os from "node:os"
import path from "node:path"
import { Buffer } from "node:buffer"
import { scoreResponse } from "../dist/engine/score.js"
import { computeSignals } from "../dist/lib/signals.js"
import { computeTrust } from "../dist/lib/trust.js"
import { createApp } from "../dist/server.js"

const verificationCases = {
  consistent: {
    prompt: "What is the capital of France?",
    response: "Paris is the capital of France.",
    domain: "general"
  },
  doubtful: {
    prompt: "What is the capital of France?",
    response:
      "France has several important cities and the answer depends on historical context.",
    domain: "general"
  },
  risky: {
    prompt: "What is the capital of France?",
    response:
      "Lyon is definitely the capital of France and that is guaranteed to be true in every source.",
    domain: "general"
  }
}

function check(condition, message) {
  assert.ok(condition, message)
  console.log(`[OK] ${message}`)
}

async function runScoringChecks() {
  const consistent = scoreResponse(verificationCases.consistent)
  const doubtful = scoreResponse(verificationCases.doubtful)
  const risky = scoreResponse(verificationCases.risky)

  check(
    consistent.consistency_score > doubtful.consistency_score,
    "scoring: consistente puntua mejor que dudosa"
  )
  check(
    doubtful.consistency_score !== consistent.consistency_score,
    "scoring: caso dudoso se diferencia del consistente"
  )
  check(
    consistent.hallucination_risk < risky.hallucination_risk,
    "scoring: consistente tiene menos hallucination risk"
  )
  check(
    risky.risk_level === "high" || risky.recommended_action === "manual_review",
    "scoring: caso riesgoso eleva el nivel de accion"
  )

  const consistentTrust = computeTrust(
    computeSignals(
      verificationCases.consistent.prompt,
      verificationCases.consistent.response
    )
  )
  const riskyTrust = computeTrust(
    computeSignals(verificationCases.risky.prompt, verificationCases.risky.response)
  )

  check(
    consistentTrust.trust_score > riskyTrust.trust_score,
    "trust: consistente supera a riesgosa"
  )
  check(
    riskyTrust.recommended_action !== "accept",
    "trust: caso riesgoso no recomienda accept"
  )
}

async function runIntegrationChecks() {
  const previousDbFile = process.env.PAYMENTS_DB_FILE
  const previousDevTopup = process.env.DEV_TOPUP_ENABLED
  const previousAdminToken = process.env.ADMIN_TOKEN
  const previousPaymentMode = process.env.PAYMENT_MODE
  const previousTrialEnabled = process.env.ONBOARDING_TRIAL_CREDIT_ENABLED
  const previousTrialUsdc = process.env.ONBOARDING_TRIAL_CREDIT_USDC
  const previousX402FacilitatorUrl = process.env.X402_FACILITATOR_URL
  const facilitatorCalls = {
    verify: 0,
    settle: 0
  }
  const facilitatorServer = nodeHttp.createServer(async (req, res) => {
    let raw = ""
    for await (const chunk of req) {
      raw += chunk
    }
    const body = raw ? JSON.parse(raw) : {}

    res.setHeader("Content-Type", "application/json")
    if (req.url === "/verify") {
      facilitatorCalls.verify += 1
      res.end(
        JSON.stringify({
          isValid:
            body?.paymentPayload?.accepted?.amount ===
            body?.paymentRequirements?.amount,
          payer: "0x0000000000000000000000000000000000000abc"
        })
      )
      return
    }

    if (req.url === "/settle") {
      facilitatorCalls.settle += 1
      res.end(
        JSON.stringify({
          success: true,
          payer: "0x0000000000000000000000000000000000000abc",
          transaction: `0xtestsettlement${facilitatorCalls.settle}`,
          network: body?.paymentRequirements?.network ?? "eip155:8453",
          amount: body?.paymentRequirements?.amount
        })
      )
      return
    }

    res.statusCode = 404
    res.end(JSON.stringify({ error: "not_found" }))
  })
  await new Promise((resolve) => facilitatorServer.listen(0, "127.0.0.1", resolve))
  const facilitatorAddress = facilitatorServer.address()
  const facilitatorPort =
    typeof facilitatorAddress === "object" && facilitatorAddress
      ? facilitatorAddress.port
      : 0
  process.env.PAYMENTS_DB_FILE = path.join(
    fs.mkdtempSync(path.join(os.tmpdir(), "ai-risk-oracle-tests-")),
    "payments.db"
  )
  process.env.DEV_TOPUP_ENABLED = "true"
  process.env.ADMIN_TOKEN = "test-admin-token"
  process.env.X402_FACILITATOR_URL = `http://127.0.0.1:${facilitatorPort}`

  const app = await createApp()

  const http = async (method, url, options = {}) => {
    const res = await app.inject({
      method,
      url,
      headers: options.headers,
      payload: options.body
    })

    let json
    try {
      json = res.json()
    } catch {
      json = { raw: res.body }
    }

    return {
      status: res.statusCode,
      headers: res.headers,
      json
    }
  }

  const encodePaymentPayload = (payload) =>
    Buffer.from(JSON.stringify(payload)).toString("base64")

  const onboardAndGetKey = async () => {
    const onboard = await http("POST", "/onboard")
    assert.equal(onboard.status, 200)
    check(Boolean(onboard.json?.api_key), "onboard devuelve api_key")
    return onboard.json.api_key
  }

  const runContractChecks = async () => {
    const health = await http("GET", "/health")
    assert.equal(health.status, 200)
    check(health.json?.ok === true, "health responde ok")
    check(
      typeof health.json?.payment_mode === "string",
      "health expone payment_mode"
    )

    const ready = await http("GET", "/ready")
    assert.equal(ready.status, 200)
    check(ready.json?.ready === true, "ready responde listo")

    const landing = await http("GET", "/", {
      headers: { Host: "localhost:3000" }
    })
    assert.equal(landing.status, 200)
    check(
      String(landing.headers["content-type"] || "").includes("text/html"),
      "landing publica HTML"
    )
    check(
      String(landing.json?.raw || "").includes("InterAI Risk Oracle"),
      "landing comunica el producto"
    )

    const serviceSummary = await http("GET", "/service.json", {
      headers: { Host: "localhost:3000" }
    })
    assert.equal(serviceSummary.status, 200)
    check(
      serviceSummary.json?.endpoints?.verify === "POST /verify",
      "service.json conserva resumen machine-readable"
    )

    const favicon = await http("GET", "/favicon.ico")
    assert.equal(favicon.status, 204)
    check(true, "favicon no ensucia telemetry de 404")

    const wellKnown = await http("GET", "/.well-known/ai-service.json", {
      headers: { Host: "localhost:3000" }
    })
    assert.equal(wellKnown.status, 200)
    check(
      Boolean(wellKnown.json?.discovery?.openapi),
      "well-known expone discovery openapi"
    )
    check(
      Boolean(wellKnown.json?.discovery?.a2a_agent_card),
      "well-known expone agent card A2A"
    )
    check(
      Boolean(wellKnown.json?.schemas?.trust_receipt_public),
      "well-known expone schema publico de receipt"
    )

    const wellKnownAlias = await http("GET", "/.well-known/ai-risk-oracle", {
      headers: { Host: "localhost:3000" }
    })
    assert.equal(wellKnownAlias.status, 200)
    check(
      wellKnownAlias.json?.id === "interai-risk-oracle",
      "alias well-known ai-risk-oracle responde descriptor"
    )

    const openapi = await http("GET", "/.well-known/openapi.json", {
      headers: { Host: "localhost:3000" }
    })
    assert.equal(openapi.status, 200)
    check(
      Boolean(openapi.json?.paths?.["/schemas/trust-receipt-public.json"]),
      "openapi documenta schema publico de receipt"
    )
    check(Boolean(openapi.json?.paths?.["/verify"]), "openapi documenta verify")
    check(
      Boolean(openapi.json?.paths?.["/verify/batch"]),
      "openapi documenta verify/batch"
    )
    check(
      Boolean(openapi.json?.paths?.["/trust/reputation"]),
      "openapi documenta trust/reputation"
    )
    check(Boolean(openapi.json?.paths?.["/a2a"]), "openapi documenta a2a")

    const openapiAlias = await http("GET", "/openapi.json", {
      headers: { Host: "localhost:3000" }
    })
    assert.equal(openapiAlias.status, 200)
    check(openapiAlias.json?.openapi === "3.0.3", "alias openapi.json responde contrato")

    const agentCard = await http("GET", "/.well-known/agent.json", {
      headers: { Host: "localhost:3000" }
    })
    assert.equal(agentCard.status, 200)
    check(agentCard.json?.url === "https://localhost:3000/a2a", "agent card publica endpoint A2A")
    check(
      Array.isArray(agentCard.json?.skills) &&
        agentCard.json.skills.some((skill) => skill.id === "verify_response"),
      "agent card publica skill verify_response"
    )

    const discoveryBundle = await http("GET", "/.well-known/discovery-bundle.json", {
      headers: { Host: "localhost:3000" }
    })
    assert.equal(discoveryBundle.status, 200)
    check(
      discoveryBundle.json?.interfaces?.a2a?.endpoint ===
        "https://localhost:3000/a2a",
      "discovery bundle publica endpoint A2A"
    )
    check(
      discoveryBundle.json?.interfaces?.mcp?.endpoint ===
        "https://localhost:3000/mcp",
      "discovery bundle publica endpoint MCP"
    )
    check(
      Boolean(discoveryBundle.json?.discovery?.agent_card_url),
      "discovery bundle publica referencias de discovery"
    )

    const discoveryAlias = await http("GET", "/discovery.json", {
      headers: { Host: "localhost:3000" }
    })
    assert.equal(discoveryAlias.status, 200)
    check(
      discoveryAlias.json?.service?.id === "interai-risk-oracle",
      "alias discovery.json responde bundle"
    )

    const pricing = await http("GET", "/pricing", {
      headers: { Host: "localhost:3000" }
    })
    assert.equal(pricing.status, 200)
    check(
      pricing.json?.pricing?.verify?.cost_usdc === "0.0006",
      "pricing publica costo de verify"
    )
    check(
      typeof pricing.json?.pricing?.trial?.enabled === "boolean",
      "pricing publica trial"
    )
    check(
      typeof pricing.json?.pricing?.trial?.estimated_calls_by_mode?.semantic_judge ===
        "number",
      "pricing publica trial por modo"
    )
    check(
      pricing.json?.pricing?.protocols?.x402?.accepts?.[0]?.scheme === "exact",
      "pricing publica x402 exact accepts"
    )
    check(
      pricing.json?.pricing?.protocols?.x402?.accepts?.[0]?.amount === "600",
      "pricing publica x402 atomic amount"
    )
    check(
      pricing.json?.pricing?.verify?.modes?.semantic_judge?.cost_microusdc === 3000,
      "pricing publica modo semantic_judge"
    )

    const currentPaymentMode = process.env.PAYMENT_MODE
    process.env.PAYMENT_MODE = "onchain"
    const onchainQuote = await http("POST", "/quote", {
      body: { mode: "fast" }
    })
    if (currentPaymentMode == null) {
      delete process.env.PAYMENT_MODE
    } else {
      process.env.PAYMENT_MODE = currentPaymentMode
    }
    assert.equal(onchainQuote.status, 410)
    check(
      onchainQuote.json?.error === "legacy_quote_deprecated",
      "quote legacy queda deshabilitado en modo onchain"
    )

    const mcpInit = await http("POST", "/mcp", {
      body: {
        jsonrpc: "2.0",
        id: "mcp-init-1",
        method: "initialize",
        params: {
          protocolVersion: "2025-11-25",
          capabilities: {},
          clientInfo: {
            name: "tests",
            version: "0.0.1"
          }
        }
      }
    })
    assert.equal(mcpInit.status, 200)
    check(
      mcpInit.json?.result?.serverInfo?.name === "interai-risk-oracle",
      "mcp initialize responde serverInfo"
    )

    const mcpTools = await http("POST", "/mcp", {
      body: {
        jsonrpc: "2.0",
        id: "mcp-tools-1",
        method: "tools/list"
      }
    })
    assert.equal(mcpTools.status, 200)
    check(
      Array.isArray(mcpTools.json?.result?.tools) &&
        mcpTools.json.result.tools.some((tool) => tool.name === "oracle.verify_response") &&
        mcpTools.json.result.tools.some((tool) => tool.name === "oracle.get_pricing"),
      "mcp tools/list publica tool de verify"
    )

    const mcpResources = await http("POST", "/mcp", {
      body: {
        jsonrpc: "2.0",
        id: "mcp-resources-1",
        method: "resources/list"
      }
    })
    assert.equal(mcpResources.status, 200)
    check(
      Array.isArray(mcpResources.json?.result?.resources) &&
        mcpResources.json.result.resources.some(
          (resource) => resource.uri === "oracle://service/discovery-bundle"
        ),
      "mcp resources/list publica discovery bundle"
    )

    const mcpReadResource = await http("POST", "/mcp", {
      body: {
        jsonrpc: "2.0",
        id: "mcp-resource-read-1",
        method: "resources/read",
        params: {
          uri: "oracle://service/discovery-bundle"
        }
      }
    })
    assert.equal(mcpReadResource.status, 200)
    check(
      String(mcpReadResource.json?.result?.contents?.[0]?.text || "").includes("verify_batch"),
      "mcp resources/read devuelve bundle"
    )

    const mcpReadPricing = await http("POST", "/mcp", {
      body: {
        jsonrpc: "2.0",
        id: "mcp-resource-read-pricing-1",
        method: "resources/read",
        params: {
          uri: "oracle://service/pricing"
        }
      }
    })
    assert.equal(mcpReadPricing.status, 200)
    check(
      String(mcpReadPricing.json?.result?.contents?.[0]?.text || "").includes("\"verify\""),
      "mcp resources/read devuelve pricing"
    )

    const mcpPrompts = await http("POST", "/mcp", {
      body: {
        jsonrpc: "2.0",
        id: "mcp-prompts-1",
        method: "prompts/list"
      }
    })
    assert.equal(mcpPrompts.status, 200)
    check(
      Array.isArray(mcpPrompts.json?.result?.prompts) &&
        mcpPrompts.json.result.prompts.some((prompt) => prompt.name === "verify_response"),
      "mcp prompts/list publica verify_response"
    )

    const mcpPromptGet = await http("POST", "/mcp", {
      body: {
        jsonrpc: "2.0",
        id: "mcp-prompt-get-1",
        method: "prompts/get",
        params: {
          name: "verify_response"
        }
      }
    })
    assert.equal(mcpPromptGet.status, 200)
    check(
      String(mcpPromptGet.json?.result?.messages?.[0]?.content?.text || "").includes(
        "oracle.verify_response"
      ),
      "mcp prompts/get devuelve template"
    )

    const mcpPricingTool = await http("POST", "/mcp", {
      body: {
        jsonrpc: "2.0",
        id: "mcp-pricing-1",
        method: "tools/call",
        params: {
          name: "oracle.get_pricing",
          arguments: {}
        }
      }
    })
    assert.equal(mcpPricingTool.status, 200)
    check(
      String(mcpPricingTool.json?.result?.content?.[0]?.text || "").includes("\"trial\""),
      "mcp tools/call devuelve pricing"
    )

    const publicReceiptSchema = await http(
      "GET",
      "/schemas/trust-receipt-public.json"
    )
    assert.equal(publicReceiptSchema.status, 200)
    check(
      publicReceiptSchema.json?.title ===
        "AI Risk Oracle Public Trust Receipt Lookup",
      "schema publico de receipt responde"
    )

    const verifyResultSchema = await http("GET", "/schemas/verify-result.json")
    assert.equal(verifyResultSchema.status, 200)
    check(
      verifyResultSchema.json?.required?.includes("consistency_score"),
      "schema de verify incluye consistency_score"
    )
    check(
      verifyResultSchema.json?.required?.includes("trust_receipt"),
      "schema de verify incluye trust_receipt"
    )
    check(
      verifyResultSchema.json?.required?.includes("historical_context"),
      "schema de verify incluye historical_context"
    )
    check(
      verifyResultSchema.json?.required?.includes("risk_factors"),
      "schema de verify incluye risk_factors"
    )

    const stats = await http("GET", "/stats", {
      headers: {
        "x-admin-token": "test-admin-token"
      }
    })
    assert.equal(stats.status, 200)
    check(
      typeof stats.json?.discovery?.totals_by_type?.service_descriptor_view ===
        "number",
      "stats expone discovery telemetry"
    )
    check(
      typeof stats.json?.discovery?.funnel?.discovery_views === "number",
      "stats expone funnel de adopcion"
    )
    check(
      typeof stats.json?.discovery?.funnel?.trial_credit_granted === "number",
      "stats expone trial en funnel"
    )
    check(
      typeof stats.json?.discovery?.funnel?.landing_views === "number",
      "stats expone landing en funnel"
    )
  }

  const runA2AEdgeChecks = async (apiKey) => {
    const invalidJsonRpc = await http("POST", "/a2a", {
      body: {
        jsonrpc: "1.0",
        id: "bad-jsonrpc",
        method: "message/send",
        params: {}
      }
    })
    assert.equal(invalidJsonRpc.status, 400)
    check(
      invalidJsonRpc.json?.error?.data?.error === "invalid_jsonrpc_version",
      "a2a rechaza jsonrpc invalido"
    )

    const missingAuth = await http("POST", "/a2a", {
      body: {
        jsonrpc: "2.0",
        id: "missing-auth",
        method: "message/send",
        params: {
          message: {
            role: "user",
            messageId: "msg-no-auth",
            parts: [
              {
                kind: "data",
                data: verificationPayload("What is the capital of France?", "Paris")
              }
            ]
          }
        }
      }
    })
    assert.equal(missingAuth.status, 200)
    check(
      missingAuth.json?.error?.data?.error === "payment_required",
      "a2a exige bearer auth"
    )

    const unsupportedMethod = await http("POST", "/a2a", {
      headers: {
        Authorization: `Bearer ${apiKey}`
      },
      body: {
        jsonrpc: "2.0",
        id: "unsupported-method",
        method: "message/stream",
        params: {
          message: {
            role: "user",
            messageId: "msg-unsupported",
            parts: [{ kind: "text", text: "{}" }]
          }
        }
      }
    })
    assert.equal(unsupportedMethod.status, 200)
    check(
      unsupportedMethod.json?.error?.data?.error === "unsupported_a2a_method",
      "a2a rechaza metodo no soportado"
    )

    const invalidRole = await http("POST", "/a2a", {
      headers: {
        Authorization: `Bearer ${apiKey}`
      },
      body: {
        jsonrpc: "2.0",
        id: "invalid-role",
        method: "message/send",
        params: {
          message: {
            role: "agent",
            messageId: "msg-invalid-role",
            parts: [{ kind: "text", text: "{}" }]
          }
        }
      }
    })
    assert.equal(invalidRole.status, 200)
    check(
      invalidRole.json?.error?.data?.error === "invalid_a2a_role",
      "a2a exige role user"
    )

    const replayKey = `a2a-replay-${Date.now()}`
    const a2aReplay1 = await http("POST", "/a2a", {
      headers: {
        Authorization: `Bearer ${apiKey}`
      },
      body: {
        jsonrpc: "2.0",
        id: "a2a-replay-1",
        method: "message/send",
        params: {
          message: {
            role: "user",
            messageId: "msg-a2a-replay-1",
            parts: [
              {
                kind: "text",
                text: JSON.stringify(
                  verificationPayload("What is the capital of France?", "Paris")
                )
              }
            ]
          },
          metadata: {
            idempotency_key: replayKey
          }
        }
      }
    })
    const a2aReplay2 = await http("POST", "/a2a", {
      headers: {
        Authorization: `Bearer ${apiKey}`
      },
      body: {
        jsonrpc: "2.0",
        id: "a2a-replay-2",
        method: "message/send",
        params: {
          message: {
            role: "user",
            messageId: "msg-a2a-replay-2",
            parts: [
              {
                kind: "text",
                text: JSON.stringify(
                  verificationPayload("What is the capital of France?", "Paris")
                )
              }
            ]
          },
          metadata: {
            idempotency_key: replayKey
          }
        }
      }
    })
    assert.equal(a2aReplay1.status, 200)
    assert.equal(a2aReplay2.status, 200)
    check(
      a2aReplay2.json?.result?.parts?.[0]?.data?.billed?.idempotent_replay === true,
      "a2a repite idempotency sin doble cargo"
    )
  }

  try {
    await runContractChecks()

    const noBalanceKey = await onboardAndGetKey()
    const missingPayment = await http("POST", "/verify", {
      body: verificationPayload("What is the capital of France?", "Paris")
    })
    assert.equal(missingPayment.status, 402)
    check(
      Boolean(missingPayment.headers["payment-required"]),
      "verify sin auth publica PAYMENT-REQUIRED x402"
    )
    check(
      missingPayment.json?.accepts?.[0]?.network === "eip155:8453",
      "verify sin auth publica x402 Base"
    )

    const noBalanceVerify = await http("POST", "/verify", {
      headers: {
        Authorization: `Bearer ${noBalanceKey}`,
        "X-Idempotency-Key": `insufficient-${Date.now()}`
      },
      body: verificationPayload("What is the capital of France?", "Paris")
    })
    assert.equal(noBalanceVerify.status, 402)
    check(
      noBalanceVerify.json?.error === "insufficient_balance",
      "verify sin balance devuelve insufficient_balance"
    )

    const paymentRequired = missingPayment.json
    const accepted = paymentRequired.accepts?.[0]
    const x402Payload = {
      x402Version: 2,
      resource: paymentRequired.resource,
      accepted,
      payload: {
        authorization: "test-signature"
      }
    }
    const x402Verify = await http("POST", "/verify", {
      headers: {
        "PAYMENT-SIGNATURE": encodePaymentPayload(x402Payload)
      },
      body: verificationPayload("What is the capital of France?", "Paris")
    })
    assert.equal(x402Verify.status, 200)
    check(
      x402Verify.headers["payment-response"] &&
        x402Verify.json?.billed?.mode === "x402",
      "verify acepta PAYMENT-SIGNATURE y devuelve PAYMENT-RESPONSE"
    )
    check(
      facilitatorCalls.verify === 1 && facilitatorCalls.settle === 1,
      "verify x402 usa facilitator verify y settle"
    )

    process.env.ONBOARDING_TRIAL_CREDIT_ENABLED = "true"
    process.env.ONBOARDING_TRIAL_CREDIT_USDC = "0.0012"
    const trialOnboard = await http("POST", "/onboard")
    assert.equal(trialOnboard.status, 200)
    check(
      trialOnboard.json?.trial?.credit_applied === true,
      "onboard aplica trial cuando esta habilitado"
    )
    check(
      trialOnboard.json?.balance?.balance_usdc === "0.001200",
      "onboard trial acredita saldo esperado"
    )
    if (previousTrialEnabled == null) {
      delete process.env.ONBOARDING_TRIAL_CREDIT_ENABLED
    } else {
      process.env.ONBOARDING_TRIAL_CREDIT_ENABLED = previousTrialEnabled
    }
    if (previousTrialUsdc == null) {
      delete process.env.ONBOARDING_TRIAL_CREDIT_USDC
    } else {
      process.env.ONBOARDING_TRIAL_CREDIT_USDC = previousTrialUsdc
    }

    const apiKey = await onboardAndGetKey()
    const topup = await http("POST", "/topup/dev/credit", {
      headers: {
        Authorization: `Bearer ${apiKey}`
      },
      body: {
        amount_usdc: "0.02"
      }
    })
    assert.equal(topup.status, 200)
    check(topup.json?.credited_usdc === "0.02", "topup dev acredita saldo")

    await runA2AEdgeChecks(apiKey)

    const verifyKey = `verify-idempotency-${Date.now()}`
    const reputationBeforeVerify = await http("GET", "/trust/reputation", {
      headers: {
        Authorization: `Bearer ${apiKey}`
      }
    })
    assert.equal(reputationBeforeVerify.status, 200)
    check(
      reputationBeforeVerify.json?.reputation?.sample_size >= 1,
      "trust/reputation expone historial existente"
    )

    const verify1 = await http("POST", "/verify", {
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "X-Idempotency-Key": verifyKey
      },
      body: verificationPayload("What is the capital of France?", "Paris")
    })
    const verify2 = await http("POST", "/verify", {
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "X-Idempotency-Key": verifyKey
      },
      body: verificationPayload("What is the capital of France?", "Paris")
    })
    assert.equal(verify1.status, 200)
    assert.equal(verify2.status, 200)
    check(
      verify1.json?.historical_context?.prior_to_current === true,
      "verify devuelve contexto historico previo"
    )
    check(
      typeof verify1.json?.historical_context?.sample_size === "number",
      "verify devuelve sample_size historico"
    )
    check(
      verify1.json?.verdict && Array.isArray(verify1.json?.risk_factors),
      "verify devuelve verdict y risk_factors"
    )
    check(
      typeof verify1.json?.claims_checked === "number" &&
        typeof verify1.json?.trust_receipt?.claims_checked === "number",
      "verify devuelve claims summary en resultado y receipt"
    )
    check(
      verify2.headers["x-oracle-idempotent-replay"] === "true",
      "verify repite idempotency sin doble cargo"
    )

    const semanticVerify = await http("POST", "/verify", {
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "X-Idempotency-Key": `semantic-verify-${Date.now()}`
      },
      body: {
        ...verificationPayload(
          "Should an agent release payment after checking delivery?",
          "Check delivery, match the invoice, and review exceptions before release."
        ),
        mode: "semantic_judge"
      }
    })
    assert.equal(semanticVerify.status, 200)
    check(
      semanticVerify.json?.verification_mode === "semantic_judge" &&
        semanticVerify.json?.semantic_judge?.judge_version === "semantic-judge-v1",
      "verify semantic_judge devuelve chequeo semantico"
    )
    check(
      semanticVerify.headers["x-oracle-cost-microusdc"] === "3000",
      "verify semantic_judge cobra tier correcto"
    )

    const reputationAfterVerify = await http("GET", "/trust/reputation?domains_limit=5", {
      headers: {
        Authorization: `Bearer ${apiKey}`
      }
    })
    assert.equal(reputationAfterVerify.status, 200)
    check(
      reputationAfterVerify.json?.reputation?.sample_size >=
        reputationBeforeVerify.json?.reputation?.sample_size,
      "trust/reputation acumula receipts de la cuenta"
    )
    check(
      Array.isArray(reputationAfterVerify.json?.reputation?.domains),
      "trust/reputation devuelve breakdown por dominio"
    )

    const a2aVerify = await http("POST", "/a2a", {
      headers: {
        Authorization: `Bearer ${apiKey}`
      },
      body: {
        jsonrpc: "2.0",
        id: "a2a-verify-1",
        method: "message/send",
        params: {
          message: {
            role: "user",
            messageId: "client-message-1",
            parts: [
              {
                kind: "data",
                data: verificationPayload("What is the capital of France?", "Paris")
              }
            ]
          },
          metadata: {
            idempotency_key: `a2a-idempotency-${Date.now()}`
          }
        }
      }
    })
    assert.equal(a2aVerify.status, 200)
    check(
      a2aVerify.json?.result?.parts?.[0]?.data?.result?.trust_receipt?.receipt_id,
      "a2a devuelve trust_receipt en respuesta sincronica"
    )
    check(
      a2aVerify.json?.result?.parts?.[0]?.data?.result?.historical_context
        ?.prior_to_current === true,
      "a2a devuelve historical_context"
    )

    const mcpVerify = await http("POST", "/mcp", {
      headers: {
        Authorization: `Bearer ${apiKey}`
      },
      body: {
        jsonrpc: "2.0",
        id: "mcp-verify-1",
        method: "tools/call",
        params: {
          name: "oracle.verify_response",
          arguments: {
            prompt: "What is the capital of France?",
            response: "Paris",
            domain: "general",
            idempotency_key: `mcp-verify-${Date.now()}`
          }
        }
      }
    })
    assert.equal(mcpVerify.status, 200)
    check(
      String(mcpVerify.json?.result?.content?.[0]?.text || "").includes("trust_receipt"),
      "mcp tools/call devuelve resultado de verify"
    )
    check(
      String(mcpVerify.json?.result?.content?.[0]?.text || "").includes("historical_context"),
      "mcp tools/call devuelve historical_context"
    )

    const batchKey = `batch-idempotency-${Date.now()}`
    const batchPayload = {
      items: [
        verificationPayload("2 + 2 = ?", "4"),
        verificationPayload("Capital of Spain?", "Madrid")
      ]
    }
    const batch1 = await http("POST", "/verify/batch", {
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "X-Idempotency-Key": batchKey
      },
      body: batchPayload
    })
    const batch2 = await http("POST", "/verify/batch", {
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "X-Idempotency-Key": batchKey
      },
      body: batchPayload
    })
    assert.equal(batch1.status, 200)
    assert.equal(batch2.status, 200)
    check(
      batch2.headers["x-oracle-idempotent-replay"] === "true",
      "verify/batch repite idempotency sin doble cargo"
    )
    check(
      batch1.json?.results?.[0]?.trust_receipt?.receipt_id,
      "verify/batch devuelve trust_receipt por item"
    )
    check(
      batch1.json?.results?.[0]?.historical_context?.prior_to_current === true,
      "verify/batch devuelve historical_context por item"
    )

    const me = await http("GET", "/me", {
      headers: {
        Authorization: `Bearer ${apiKey}`
      }
    })
    assert.equal(me.status, 200)
    check(
      me.json?.balance?.balance_usdc === "0.013600",
      "billing final conserva el saldo esperado"
    )
  } finally {
    await app.close()
    await new Promise((resolve) => facilitatorServer.close(resolve))

    if (previousDbFile == null) {
      delete process.env.PAYMENTS_DB_FILE
    } else {
      process.env.PAYMENTS_DB_FILE = previousDbFile
    }

    if (previousDevTopup == null) {
      delete process.env.DEV_TOPUP_ENABLED
    } else {
      process.env.DEV_TOPUP_ENABLED = previousDevTopup
    }

    if (previousAdminToken == null) {
      delete process.env.ADMIN_TOKEN
    } else {
      process.env.ADMIN_TOKEN = previousAdminToken
    }

    if (previousPaymentMode == null) {
      delete process.env.PAYMENT_MODE
    } else {
      process.env.PAYMENT_MODE = previousPaymentMode
    }

    if (previousTrialEnabled == null) {
      delete process.env.ONBOARDING_TRIAL_CREDIT_ENABLED
    } else {
      process.env.ONBOARDING_TRIAL_CREDIT_ENABLED = previousTrialEnabled
    }

    if (previousTrialUsdc == null) {
      delete process.env.ONBOARDING_TRIAL_CREDIT_USDC
    } else {
      process.env.ONBOARDING_TRIAL_CREDIT_USDC = previousTrialUsdc
    }

    if (previousX402FacilitatorUrl == null) {
      delete process.env.X402_FACILITATOR_URL
    } else {
      process.env.X402_FACILITATOR_URL = previousX402FacilitatorUrl
    }
  }
}

function verificationPayload(prompt, response) {
  return {
    prompt,
    response,
    domain: "general"
  }
}

async function main() {
  await runScoringChecks()
  await runIntegrationChecks()
  console.log("TEST SUITE OK")
}

main().catch((error) => {
  console.error("TEST SUITE FAILED")
  console.error(error)
  process.exit(1)
})
