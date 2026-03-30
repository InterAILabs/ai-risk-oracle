import { FastifyPluginAsync } from "fastify"
import { randomUUID } from "crypto"
import {
  getPayment,
  consume,
  confirmOnchainPayment,
  debitAccountForUsage,
  getAccount,
  getAccountBalance,
  hasUsageReference,
  resolveAccountByApiKey
} from "../payments/fileStore.js"
import { scoreResponse } from "../engine/score.js"
import { verifyUsdcPaymentOnBaseRpc } from "../payments/onchainBaseUsdc.js"
import { PRICING } from "../config/pricing.js"

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

export const verifyRoute: FastifyPluginAsync = async (app) => {
  app.post("/verify", async (req, reply) => {
    const paymentRef = req.headers["x-payment-ref"] as string | undefined
    const accountIdHeader = req.headers["x-account-id"] as string | undefined
    const idempotencyKey = req.headers["x-idempotency-key"] as string | undefined
    const authHeader = req.headers["authorization"] as string | undefined
    const bearerToken = extractBearerToken(authHeader)

    let resolvedAccountId: string | undefined

    if (bearerToken) {
      const resolved = resolveAccountByApiKey(bearerToken)
      if (!resolved) {
        return reply.code(401).send({ error: "invalid_api_key" })
      }
      resolvedAccountId = resolved.account_id
      reply.header("X-Oracle-Auth-Mode", "bearer")
    } else if (accountIdHeader) {
      resolvedAccountId = accountIdHeader
      reply.header("X-Oracle-Auth-Mode", "x-account-id")
    }

    if (!paymentRef && !resolvedAccountId) {
      return reply.code(402).send({
        error: "payment_required",
        hint: "Provide Authorization Bearer token, x-account-id, or x-payment-ref"
      })
    }

    if (paymentRef && resolvedAccountId) {
      return reply.code(400).send({
        error: "ambiguous_payment_mode",
        hint: "Use account auth or x-payment-ref, not both"
      })
    }

    const body = req.body as any
    const result = scoreResponse({
      prompt: body?.prompt ?? "",
      response: body?.response ?? "",
      domain: body?.domain ?? "general"
    })

    if (resolvedAccountId) {
      const account = getAccount(resolvedAccountId)
      if (!account) {
        return reply.code(402).send({ error: "account_not_found" })
      }

      if (account.status !== "active") {
        return reply.code(402).send({ error: "account_not_active" })
      }

      if (idempotencyKey) {
        const existingUsage = hasUsageReference(resolvedAccountId, idempotencyKey)
        if (existingUsage) {
          const balance = getAccountBalance(resolvedAccountId)

          reply.header("X-Oracle-Billing-Mode", "account")
          reply.header("X-Oracle-Idempotent-Replay", "true")
          reply.header("X-Oracle-Cost", PRICING.fast.amount)
          reply.header("X-Oracle-Cost-MicroUSDC", String(existingUsage.cost_microusdc))
          reply.header("X-Oracle-Currency", "USDC")
          reply.header("X-Oracle-Engine-Version", ENGINE_VERSION)
          reply.header(
            "X-Oracle-Latency-Ms",
            String(result.analysis.total_latency_ms ?? result.analysis.engine_latency_ms ?? 0)
          )
          if (balance) {
            reply.header("X-Oracle-Remaining-Balance-MicroUSDC", String(balance.balance_microusdc))
            reply.header("X-Oracle-Remaining-Balance-USDC", balance.balance_usdc)
          }

          return result
        }
      }

      const costMicrousdc = usdcAmountToMicrousdc(PRICING.fast.amount)

      const debit = debitAccountForUsage({
        ledgerId: randomUUID(),
        usageId: randomUUID(),
        accountId: resolvedAccountId,
        service: "verify",
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

      reply.header("X-Oracle-Billing-Mode", "account")
      reply.header("X-Oracle-Cost", PRICING.fast.amount)
      reply.header("X-Oracle-Cost-MicroUSDC", String(costMicrousdc))
      reply.header("X-Oracle-Currency", "USDC")
      reply.header("X-Oracle-Engine-Version", ENGINE_VERSION)
      reply.header(
        "X-Oracle-Latency-Ms",
        String(result.analysis.total_latency_ms ?? result.analysis.engine_latency_ms ?? 0)
      )
      reply.header(
        "X-Oracle-Remaining-Balance-MicroUSDC",
        String(debit.remaining_balance_microusdc)
      )
      reply.header("X-Oracle-Remaining-Balance-USDC", debit.remaining_balance_usdc)

      return result
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

    const consumed = consume(ref)
    if (!consumed) return reply.code(402).send({ error: "payment_already_used" })

    reply.header("X-Oracle-Billing-Mode", "payment_reference")
    reply.header("X-Oracle-Cost", finalPayment.amount)
    reply.header("X-Oracle-Currency", "USDC")
    reply.header("X-Oracle-Engine-Version", ENGINE_VERSION)
    reply.header(
      "X-Oracle-Latency-Ms",
      String(result.analysis.total_latency_ms ?? result.analysis.engine_latency_ms ?? 0)
    )

    return result
  })
}