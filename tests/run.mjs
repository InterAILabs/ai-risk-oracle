import assert from "node:assert/strict"
import fs from "node:fs"
import os from "node:os"
import path from "node:path"
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
  process.env.PAYMENTS_DB_FILE = path.join(
    fs.mkdtempSync(path.join(os.tmpdir(), "ai-risk-oracle-tests-")),
    "payments.db"
  )
  process.env.DEV_TOPUP_ENABLED = "true"
  process.env.ADMIN_TOKEN = "test-admin-token"

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
    check(Boolean(openapi.json?.paths?.["/a2a"]), "openapi documenta a2a")

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
      verify2.headers["x-oracle-idempotent-replay"] === "true",
      "verify repite idempotency sin doble cargo"
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

    const me = await http("GET", "/me", {
      headers: {
        Authorization: `Bearer ${apiKey}`
      }
    })
    assert.equal(me.status, 200)
    check(
      me.json?.balance?.balance_usdc === "0.017200",
      "billing final conserva el saldo esperado"
    )
  } finally {
    await app.close()

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
