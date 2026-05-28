import { randomUUID } from "crypto"
import { FastifyPluginAsync } from "fastify"
import {
  getBatchAmount,
  getVerifyAmount,
  normalizeVerificationMode,
  PRICING
} from "../config/pricing.js"
import { extractBearerToken } from "../lib/auth.js"
import { trackDiscoveryEvent } from "../lib/discovery.js"
import { economicError } from "../lib/httpErrors.js"
import {
  idempotencyConflict,
  idempotencyRequestHash
} from "../lib/idempotency.js"
import {
  createIdempotencyRecord,
  getAccount,
  getIdempotencyRecord,
  resolveAccountByApiKey
} from "../payments/fileStore.js"
import {
  buildInsufficientBalanceDetails,
  chargeAndRecordUsage,
  ENGINE_VERSION,
  ORACLE_SIGNALS_VERSION,
  runBatchVerification,
  runVerification,
  TRUST_SIGNING_ENABLED,
  usdcAmountToMicrousdc
} from "../services/verificationFlow.js"

type JsonRpcId = string | number | null

type A2ATextPart = {
  kind: "text"
  text: string
}

type A2ADataPart = {
  kind: "data"
  data: Record<string, unknown>
}

type A2AMessage = {
  role?: "user" | "agent"
  parts?: Array<A2ATextPart | A2ADataPart>
  messageId?: string
  contextId?: string
}

type A2ARequestBody = {
  jsonrpc?: string
  id?: JsonRpcId
  method?: string
  params?: {
    message?: A2AMessage
    metadata?: Record<string, unknown>
  }
}

type VerifyPayload = {
  prompt?: string
  response?: string
  domain?: string
  mode?: string
}

type VerifyBatchPayload = {
  items?: VerifyPayload[]
}

function jsonRpcSuccess(id: JsonRpcId, result: unknown) {
  return {
    jsonrpc: "2.0",
    id,
    result
  }
}

function jsonRpcError(
  id: JsonRpcId,
  code: number,
  message: string,
  data?: Record<string, unknown>
) {
  return {
    jsonrpc: "2.0",
    id,
    error: {
      code,
      message,
      ...(data ? { data } : {})
    }
  }
}

function buildA2AAgentMessage(params: {
  contextId: string
  taskId?: string
  data: Record<string, unknown>
}) {
  return {
    kind: "message" as const,
    role: "agent" as const,
    messageId: randomUUID(),
    contextId: params.contextId,
    ...(params.taskId ? { taskId: params.taskId } : {}),
    parts: [
      {
        kind: "data" as const,
        data: params.data
      }
    ]
  }
}

function validateA2AMessage(message?: A2AMessage) {
  if (!message || typeof message !== "object") {
    return {
      ok: false as const,
      error: "missing_a2a_message",
      hint: "Provide params.message with role, messageId, and parts"
    }
  }

  if (message.role !== "user") {
    return {
      ok: false as const,
      error: "invalid_a2a_role",
      hint: "A2A requests must use params.message.role = 'user'"
    }
  }

  if (!message.messageId || typeof message.messageId !== "string") {
    return {
      ok: false as const,
      error: "missing_a2a_message_id",
      hint: "A2A requests must include params.message.messageId"
    }
  }

  if (!Array.isArray(message.parts) || message.parts.length === 0) {
    return {
      ok: false as const,
      error: "missing_a2a_parts",
      hint: "A2A requests must include at least one message part"
    }
  }

  return { ok: true as const }
}

function extractPayload(message?: A2AMessage) {
  if (!message?.parts || message.parts.length === 0) {
    return null
  }

  const dataPart = message.parts.find(
    (part): part is A2ADataPart => part.kind === "data"
  )

  if (dataPart?.data && typeof dataPart.data === "object") {
    return dataPart.data
  }

  const textPart = message.parts.find(
    (part): part is A2ATextPart => part.kind === "text"
  )

  if (!textPart?.text) {
    return null
  }

  try {
    const parsed = JSON.parse(textPart.text)
    return typeof parsed === "object" && parsed ? parsed : null
  } catch {
    return null
  }
}

function normalizeVerifyPayload(payload: Record<string, unknown>) {
  if (Array.isArray(payload.items)) {
    return {
      kind: "batch" as const,
      payload: {
        items: payload.items as VerifyPayload[]
      }
    }
  }

  return {
    kind: "single" as const,
    payload: payload as VerifyPayload
  }
}

export const a2aRoute: FastifyPluginAsync = async (app) => {
  app.post("/a2a", async (req, reply) => {
    trackDiscoveryEvent(req, "a2a_call", "/a2a")
    const body = (req.body || {}) as A2ARequestBody
    const requestId = body.id ?? null

    if (body.jsonrpc !== "2.0") {
      return reply.code(400).send(
        jsonRpcError(requestId, -32600, "Invalid Request", {
          error: "invalid_jsonrpc_version"
        })
      )
    }

    if (body.method !== "message/send") {
      return reply.send(
        jsonRpcError(requestId, -32601, "Method not found", {
          error: "unsupported_a2a_method",
          supported_methods: ["message/send"]
        })
      )
    }

    const validMessage = validateA2AMessage(body.params?.message)
    if (!validMessage.ok) {
      return reply.send(
        jsonRpcError(requestId, -32602, "Invalid params", {
          error: validMessage.error,
          hint: validMessage.hint
        })
      )
    }

    const authHeader = req.headers["authorization"] as string | undefined
    const bearerToken = extractBearerToken(authHeader)

    if (!bearerToken) {
      return reply.send(
        jsonRpcError(requestId, -32001, "Unauthorized", {
          ...economicError("payment_required", {
            hint: "Provide Authorization: Bearer <api_key>",
            onboarding: {
              create_account_url: "/onboard",
              topup_create_url: "/topup/create"
            }
          })
        })
      )
    }

    const resolved = resolveAccountByApiKey(bearerToken)

    if (!resolved) {
      return reply.send(
        jsonRpcError(requestId, -32001, "Unauthorized", economicError("invalid_api_key"))
      )
    }

    const account = getAccount(resolved.account_id)
    if (!account) {
      return reply.send(
        jsonRpcError(requestId, -32002, "Payment required", economicError("account_not_found"))
      )
    }

    if (account.status !== "active") {
      return reply.send(
        jsonRpcError(
          requestId,
          -32002,
          "Payment required",
          economicError("account_not_active")
        )
      )
    }

    const payload = extractPayload(body.params?.message)
    if (!payload) {
      return reply.send(
        jsonRpcError(requestId, -32602, "Invalid params", {
          error: "missing_a2a_payload",
          hint: "Provide a data part or JSON text part with verify payload"
        })
      )
    }

    const idempotencyKey =
      (typeof body.params?.metadata?.idempotency_key === "string"
        ? body.params.metadata.idempotency_key
        : null) ??
      ((req.headers["x-idempotency-key"] as string | undefined) || null)
    const contextId =
      body.params?.message?.contextId && typeof body.params.message.contextId === "string"
        ? body.params.message.contextId
        : randomUUID()

    const normalized = normalizeVerifyPayload(payload)
    const usageId = randomUUID()

    if (normalized.kind === "batch") {
      const items = normalized.payload.items
      if (!Array.isArray(items)) {
        return reply.send(
          jsonRpcError(requestId, -32602, "Invalid params", economicError("invalid_batch_items"))
        )
      }

      if (items.length === 0) {
        return reply.send(
          jsonRpcError(requestId, -32602, "Invalid params", economicError("empty_batch"))
        )
      }

      if (items.length > 100) {
        return reply.send(
          jsonRpcError(
            requestId,
            -32602,
            "Invalid params",
            economicError("batch_limit_exceeded", { max_items: 100 })
          )
        )
      }

      const normalizedItems = items.map((item) => ({
        prompt: item.prompt ?? "",
        response: item.response ?? "",
        ...(item.domain ? { domain: item.domain } : {})
      }))

      const batchAmount = getBatchAmount(items.length)
      const requestHash = idempotencyKey
        ? idempotencyRequestHash({
            service: "verify_batch",
            transport: "a2a",
            items: normalizedItems
          })
        : null

      if (idempotencyKey && requestHash) {
        const existing = getIdempotencyRecord({
          accountId: resolved.account_id,
          service: "verify_batch",
          idempotencyKey
        })

        if (existing) {
          if (existing.request_hash !== requestHash) {
            return reply.send(
              jsonRpcError(
                requestId,
                -32009,
                "Idempotency conflict",
                idempotencyConflict("verify_batch")
              )
            )
          }

          reply.header("X-Oracle-Idempotent-Replay", "true")
          return reply.send(existing.response)
        }
      }

      const debit = chargeAndRecordUsage({
        usageId,
        accountId: resolved.account_id,
        service: "verify_batch",
        costUsdc: batchAmount,
        reference: idempotencyKey ?? undefined
      })

      if (!debit.ok) {
        if (debit.error === "insufficient_balance") {
          return reply.send(
            jsonRpcError(requestId, -32002, "Payment required", {
              ...economicError("insufficient_balance"),
              ...buildInsufficientBalanceDetails({
                service: "verify_batch",
                costMicrousdc: usdcAmountToMicrousdc(batchAmount),
                costUsdc: batchAmount,
                balanceMicrousdc: Number(debit.balance_microusdc ?? 0),
                batchSize: items.length,
                includeDevCreditUrl: true
              })
            })
          )
        }

        return reply.send(
          jsonRpcError(
            requestId,
            -32002,
            "Payment required",
            economicError(String(debit.error))
          )
        )
      }

      if (debit.idempotent_replay) {
        return reply.send(
          jsonRpcError(requestId, -32009, "Idempotency replay unavailable", {
            error: "idempotency_response_unavailable",
            service: "verify_batch"
          })
        )
      }

      const verification = runBatchVerification(normalizedItems, {
        accountId: resolved.account_id,
        usageId,
        paymentRef: null
      })

      trackDiscoveryEvent(req, "a2a_success", "/a2a")

      const responseBody = jsonRpcSuccess(
        requestId,
        buildA2AAgentMessage({
          contextId,
          data: {
            skill: "verify_batch",
            ok: true,
            billed: {
              mode: "account",
              cost_usdc: batchAmount,
              cost_microusdc: debit.billed_cost_microusdc,
              remaining_balance_usdc: debit.remaining_balance_usdc,
              remaining_balance_microusdc: debit.remaining_balance_microusdc
            },
            batch_size: verification.results.length,
            results: verification.results.map((item) => ({
              ...item.result,
              trust_score: item.trust_score,
              risk_level: item.risk_level,
              trust_recommended_action: item.trust_recommended_action,
              confidence_band: item.confidence_band,
              signals: item.signals,
              historical_context: item.historical_context,
              trust_receipt: item.trust_receipt
            })),
            summary: verification.summary,
            oracle: {
              version: ENGINE_VERSION,
              signals_version: ORACLE_SIGNALS_VERSION,
              trust_signing_enabled: TRUST_SIGNING_ENABLED
            }
          }
        })
      )

      if (idempotencyKey && requestHash) {
        createIdempotencyRecord({
          accountId: resolved.account_id,
          service: "verify_batch",
          idempotencyKey,
          requestHash,
          response: responseBody,
          receiptIds: verification.results.map(
            (item) => item.trust_receipt.receipt_id
          ),
          costMicrousdc: debit.billed_cost_microusdc
        })
      }

      return reply.send(responseBody)
    }

    const prompt = normalized.payload.prompt ?? ""
    const response = normalized.payload.response ?? ""
    const domain = normalized.payload.domain ?? "general"
    const verificationMode = normalizeVerificationMode(normalized.payload.mode)
    const verifyAmount = getVerifyAmount(verificationMode)
    const requestHash = idempotencyKey
      ? idempotencyRequestHash({
          service: "verify",
          transport: "a2a",
          prompt,
          response,
          domain,
          mode: verificationMode
        })
      : null

    if (idempotencyKey && requestHash) {
      const existing = getIdempotencyRecord({
        accountId: resolved.account_id,
        service: "verify",
        idempotencyKey
      })

      if (existing) {
        if (existing.request_hash !== requestHash) {
          return reply.send(
            jsonRpcError(
              requestId,
              -32009,
              "Idempotency conflict",
              idempotencyConflict("verify")
            )
          )
        }

        reply.header("X-Oracle-Idempotent-Replay", "true")
        return reply.send(existing.response)
      }
    }

    const debit = chargeAndRecordUsage({
      usageId,
      accountId: resolved.account_id,
      service: "verify",
      costUsdc: verifyAmount,
      reference: idempotencyKey ?? undefined
    })

    if (!debit.ok) {
      if (debit.error === "insufficient_balance") {
        return reply.send(
          jsonRpcError(requestId, -32002, "Payment required", {
            ...economicError("insufficient_balance"),
            ...buildInsufficientBalanceDetails({
              service: "verify",
              costMicrousdc: usdcAmountToMicrousdc(verifyAmount),
              costUsdc: verifyAmount,
              balanceMicrousdc: Number(debit.balance_microusdc ?? 0)
            })
          })
        )
      }

      return reply.send(
        jsonRpcError(
          requestId,
          -32002,
          "Payment required",
          economicError(String(debit.error))
        )
      )
    }

    if (debit.idempotent_replay) {
      return reply.send(
        jsonRpcError(requestId, -32009, "Idempotency replay unavailable", {
          error: "idempotency_response_unavailable",
          service: "verify"
        })
      )
    }

    const verification = runVerification({
      prompt,
      response,
      domain,
      mode: verificationMode,
      accountId: resolved.account_id,
      usageId,
      paymentRef: null
    })

    trackDiscoveryEvent(req, "a2a_success", "/a2a")

    const responseBody = jsonRpcSuccess(
      requestId,
      buildA2AAgentMessage({
        contextId,
        data: {
          skill: "verify_response",
          ok: true,
          billed: {
            mode: "account",
            cost_usdc: verifyAmount,
            cost_microusdc: debit.billed_cost_microusdc,
            remaining_balance_usdc: debit.remaining_balance_usdc,
            remaining_balance_microusdc: debit.remaining_balance_microusdc
          },
          result: {
            ...verification.result,
            trust_score: verification.trust_score,
            risk_level: verification.risk_level,
            trust_recommended_action: verification.trust_recommended_action,
            confidence_band: verification.confidence_band,
            signals: verification.signals,
            verification_mode: verification.verification_mode,
            semantic_judge: verification.semantic_judge,
            historical_context: verification.historical_context,
            trust_receipt: verification.trust_receipt,
            oracle: {
              version: ENGINE_VERSION,
              signals_version: ORACLE_SIGNALS_VERSION,
              trust_signing_enabled: TRUST_SIGNING_ENABLED
            }
          }
        }
      })
    )

    if (idempotencyKey && requestHash) {
      createIdempotencyRecord({
        accountId: resolved.account_id,
        service: "verify",
        idempotencyKey,
        requestHash,
        response: responseBody,
        receiptIds: [verification.trust_receipt.receipt_id],
        costMicrousdc: debit.billed_cost_microusdc
      })
    }

    return reply.send(responseBody)
  })
}
