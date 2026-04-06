import { FastifyPluginAsync } from "fastify"
import { randomUUID } from "crypto"
import {
  getPayment,
  consume,
  confirmOnchainPayment,
  debitAccountForUsage,
  getAccount,
  resolveAccountByApiKey
} from "../payments/fileStore.js"
import { scoreResponse } from "../engine/score.js"
import { verifyUsdcPaymentOnBaseRpc } from "../payments/onchainBaseUsdc.js"
import { getBatchAmount } from "../config/pricing.js"

type BatchItem = {
  prompt: string
  response: string
  domain?: string
}

const ENGINE_VERSION = process.env.ORACLE_ENGINE_VERSION || "0.0.1"

function usdcAmountToMicrousdc(amount: string) {
  const num = Number(amount)
  if (!Number.isFinite(num) || num <= 0) {
    throw new Error("invalid_usdc_amount")
  }
  return Math.round(num * 1_000_000)
}

function extractBearerToken(authHeader: string | undefined) {
  if (!authHeader) return null
  const match = authHeader.match(/^Bearer\s+(.+)$/i)
  if (!match) return null
  return match[1]?.trim() || null
}

export const verifyBatchRoute: FastifyPluginAsync = async (app) => {
  app.post("/verify/batch", async (req, reply) => {
    const paymentRef = req.headers["x-payment-ref"] as string | undefined
    const idempotencyKey = req.headers["x-idempotency-key"] as string | undefined
    const authHeader = req.headers["authorization"] as string | undefined
    const bearerToken = extractBearerToken(authHeader)

    if (!paymentRef && !bearerToken) {
      return reply.code(402).send({
        error: "payment_required",
        hint: "Provide Authorization: Bearer <api_key> or x-payment-ref"
      })
    }

    if (paymentRef && bearerToken) {
      return reply.code(400).send({
        error: "ambiguous_payment_mode",
        hint: "Use Bearer account auth or x-payment-ref, not both"
      })
    }

    const body = req.body as { items?: BatchItem[] }

    if (!body?.items || !Array.isArray(body.items)) {
      return reply.code(400).send({ error: "invalid_batch_items" })
    }

    if (body.items.length === 0) {
      return reply.code(400).send({ error: "empty_batch" })
    }

    if (body.items.length > 100) {
      return reply.code(400).send({ error: "batch_limit_exceeded" })
    }

    if (bearerToken) {
      const resolved = resolveAccountByApiKey(bearerToken)

      if (!resolved) {
        return reply.code(401).send({ error: "invalid_api_key" })
      }

      const account = getAccount(resolved.account_id)
      if (!account) {
        return reply.code(402).send({ error: "account_not_found" })
      }

      if (account.status !== "active") {
        return reply.code(402).send({ error: "account_not_active" })
      }

      const batchAmount = getBatchAmount(body.items.length)
      const costMicrousdc = usdcAmountToMicrousdc(batchAmount)

      const debit = debitAccountForUsage({
        ledgerId: randomUUID(),
        usageId: randomUUID(),
        accountId: resolved.account_id,
        service: "verify_batch",
        costMicrousdc,
        reference: idempotencyKey
      })

      if (!debit.ok) {
        if (debit.error === "insufficient_balance") {
          return reply.code(402).send({
            error: debit.error,
            balance_microusdc: debit.balance_microusdc
          })
        }

        return reply.code(402).send({ error: debit.error })
      }

      const results = body.items.map((item) =>
        scoreResponse({
          prompt: item.prompt ?? "",
          response: item.response ?? "",
          domain: item.domain ?? "general"
        })
      )

      const avgConsistency =
        results.reduce((acc, item) => acc + item.consistency_score, 0) / results.length

      const highRiskCount = results.filter((item) => item.risk_level === "high").length

      const maxLatencyMs = Math.max(
        ...results.map((item) => item.analysis.total_latency_ms ?? item.analysis.engine_latency_ms ?? 0)
      )

      reply.header("X-Oracle-Auth-Mode", "bearer")
      reply.header("X-Oracle-Billing-Mode", "account")
      reply.header("X-Oracle-Cost", batchAmount)
      reply.header("X-Oracle-Cost-MicroUSDC", String(debit.billed_cost_microusdc))
      reply.header("X-Oracle-Currency", "USDC")
      reply.header("X-Oracle-Engine-Version", ENGINE_VERSION)
      reply.header("X-Oracle-Latency-Ms", String(maxLatencyMs))
      reply.header(
        "X-Oracle-Remaining-Balance-MicroUSDC",
        String(debit.remaining_balance_microusdc)
      )
      reply.header("X-Oracle-Remaining-Balance-USDC", debit.remaining_balance_usdc)

      if (debit.idempotent_replay) {
        reply.header("X-Oracle-Idempotent-Replay", "true")
      }

      return {
        batch_size: results.length,
        results,
        summary: {
          count: results.length,
          avg_consistency_score: Number(avgConsistency.toFixed(4)),
          high_risk_count: highRiskCount
        }
      }
    }

    const ref = paymentRef as string
    const payment = getPayment(ref)

    if (!payment) return reply.code(402).send({ error: "invalid_payment_reference" })
    if (payment.status === "expired") return reply.code(402).send({ error: "payment_expired" })
    if (payment.status === "consumed") return reply.code(402).send({ error: "payment_already_used" })

    const tx = req.headers["x-payment-tx"] as string | undefined
    const paymentMode = (process.env.PAYMENT_MODE || "file") as "file" | "onchain"

    let finalPayment = payment

    if (paymentMode === "onchain") {
      if (!tx) return reply.code(402).send({ error: "payment_tx_required" })

      const rpcUrl = process.env.BASE_RPC_URL
      if (!rpcUrl) return reply.code(500).send({ error: "missing_BASE_RPC_URL" })

      const payTo = payment.pay_to as `0x${string}`

      let ok: { ok: true } | { ok: false; error: string }

      try {
        ok = await verifyUsdcPaymentOnBaseRpc({
          txHash: tx as `0x${string}`,
          payTo,
          amount: payment.amount,
          rpcUrl
        })
      } catch (err: any) {
        const msg = String(err?.message || "")
        if (msg.includes("could not be found")) {
          return reply.code(402).send({ error: "payment_tx_not_found" })
        }
        return reply.code(500).send({ error: "onchain_verification_failed" })
      }

      if (!ok.ok) return reply.code(402).send({ error: ok.error })

      const confirmed = confirmOnchainPayment(ref, tx)
      if (!confirmed.ok) {
        return reply.code(402).send({ error: confirmed.error })
      }

      finalPayment = confirmed.payment
    }

    if (paymentMode === "file" && finalPayment.status !== "paid") {
      return reply.code(402).send({ error: "payment_not_confirmed" })
    }

    const results = body.items.map((item) =>
      scoreResponse({
        prompt: item.prompt ?? "",
        response: item.response ?? "",
        domain: item.domain ?? "general"
      })
    )

    const avgConsistency =
      results.reduce((acc, item) => acc + item.consistency_score, 0) / results.length

    const highRiskCount = results.filter((item) => item.risk_level === "high").length

    const consumedOk = consume(ref)
    if (!consumedOk) return reply.code(402).send({ error: "payment_already_used" })

    const maxLatencyMs = Math.max(
      ...results.map((item) => item.analysis.total_latency_ms ?? item.analysis.engine_latency_ms ?? 0)
    )

    reply.header("X-Oracle-Billing-Mode", "payment_reference")
    reply.header("X-Oracle-Cost", finalPayment.amount)
    reply.header("X-Oracle-Currency", "USDC")
    reply.header("X-Oracle-Engine-Version", ENGINE_VERSION)
    reply.header("X-Oracle-Latency-Ms", String(maxLatencyMs))

    return {
      batch_size: results.length,
      results,
      summary: {
        count: results.length,
        avg_consistency_score: Number(avgConsistency.toFixed(4)),
        high_risk_count: highRiskCount
      }
    }
  })
}