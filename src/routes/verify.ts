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
import { PRICING } from "../config/pricing.js"
import { extractBearerToken } from "../lib/auth.js"
import { economicError } from "../lib/httpErrors.js"

const ENGINE_VERSION = process.env.ORACLE_ENGINE_VERSION || "0.0.1"

function usdcAmountToMicrousdc(amount: string) {
  const num = Number(amount)
  if (!Number.isFinite(num) || num <= 0) {
    throw new Error("invalid_usdc_amount")
  }
  return Math.round(num * 1_000_000)
}

export const verifyRoute: FastifyPluginAsync = async (app) => {
  app.post("/verify", async (req, reply) => {
    const paymentRef = req.headers["x-payment-ref"] as string | undefined
    const idempotencyKey = req.headers["x-idempotency-key"] as string | undefined
    const authHeader = req.headers["authorization"] as string | undefined
    const bearerToken = extractBearerToken(authHeader)

    if (!paymentRef && !bearerToken) {
      return reply.code(402).send(
        economicError("payment_required", {
          hint: "Provide Authorization: Bearer <api_key> or x-payment-ref",
          onboarding: {
            create_account_url: "/onboard",
            topup_create_url: "/topup/create"
          }
        })
      )
    }

    if (paymentRef && bearerToken) {
      return reply.code(400).send(
        economicError("ambiguous_payment_mode", {
          hint: "Use Bearer account auth or x-payment-ref, not both"
        })
      )
    }

    if (bearerToken) {
      const resolved = resolveAccountByApiKey(bearerToken)

      if (!resolved) {
        return reply.code(401).send(economicError("invalid_api_key"))
      }

      const account = getAccount(resolved.account_id)
      if (!account) {
        return reply.code(402).send(economicError("account_not_found"))
      }

      if (account.status !== "active") {
        return reply.code(402).send(economicError("account_not_active"))
      }

      const costMicrousdc = usdcAmountToMicrousdc(PRICING.fast.amount)
      const usageId = randomUUID()

      const debit = debitAccountForUsage({
        ledgerId: randomUUID(),
        usageId,
        accountId: resolved.account_id,
        service: "verify",
        costMicrousdc,
        reference: idempotencyKey
      })

      if (!debit.ok) {
        if (debit.error === "insufficient_balance") {
          const balanceMicrousdc = Number(debit.balance_microusdc ?? 0)
          const shortfallMicrousdc = Math.max(costMicrousdc - balanceMicrousdc, 0)
          const recommendedTopupUsdc = String(process.env.DEFAULT_RECOMMENDED_TOPUP_USDC || "0.01")

          return reply.code(402).send(
            economicError("insufficient_balance", {
              service: "verify",
              cost_microusdc: costMicrousdc,
              cost_usdc: PRICING.fast.amount,
              balance_microusdc: balanceMicrousdc,
              balance_usdc: (balanceMicrousdc / 1_000_000).toFixed(6),
              shortfall_microusdc: shortfallMicrousdc,
              shortfall_usdc: (shortfallMicrousdc / 1_000_000).toFixed(6),
              topup: {
                create_url: "/topup/create",
                receive_address: process.env.TOPUP_RECEIVE_ADDRESS || null,
                recommended_amount_usdc: recommendedTopupUsdc
              }
            })
          )
        }

        return reply.code(402).send(economicError(String(debit.error)))
      }

      const body = req.body as any

      const result = scoreResponse({
        prompt: body?.prompt ?? "",
        response: body?.response ?? "",
        domain: body?.domain ?? "general"
      })

      reply.header("X-Oracle-Auth-Mode", "bearer")
      reply.header("X-Oracle-Billing-Mode", "account")
      reply.header("X-Oracle-Cost", PRICING.fast.amount)
      reply.header("X-Oracle-Cost-MicroUSDC", String(debit.billed_cost_microusdc))
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

      if (debit.idempotent_replay) {
        reply.header("X-Oracle-Idempotent-Replay", "true")
      }

      req.log.info({
        event: "verify_billed",
        auth_mode: "bearer",
        account_id: resolved.account_id,
        api_key_id: resolved.api_key_id,
        usage_id: usageId,
        service: "verify",
        cost_microusdc: debit.billed_cost_microusdc,
        remaining_balance_microusdc: debit.remaining_balance_microusdc,
        remaining_balance_usdc: debit.remaining_balance_usdc,
        idempotency_key: idempotencyKey ?? null,
        idempotent_replay: debit.idempotent_replay ?? false
      })

      return result
    }

    const ref = paymentRef as string
    const payment = getPayment(ref)

    if (!payment) return reply.code(402).send(economicError("invalid_payment_reference"))
    if (payment.status === "expired") return reply.code(402).send(economicError("payment_expired"))
    if (payment.status === "consumed") return reply.code(402).send(economicError("payment_already_used"))

    const tx = req.headers["x-payment-tx"] as string | undefined
    const paymentMode = (process.env.PAYMENT_MODE || "file") as "file" | "onchain"

    let finalPayment = payment

    if (paymentMode === "onchain") {
      if (!tx) return reply.code(402).send(economicError("payment_tx_required"))

      const rpcUrl = process.env.BASE_RPC_URL
      if (!rpcUrl) return reply.code(500).send(economicError("missing_BASE_RPC_URL"))

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
          return reply.code(402).send(economicError("payment_tx_not_found"))
        }
        return reply.code(500).send(economicError("onchain_verification_failed"))
      }

      if (!ok.ok) return reply.code(402).send(economicError(ok.error))

      const confirmed = confirmOnchainPayment(ref, tx)
      if (!confirmed.ok) {
        return reply.code(402).send(economicError(confirmed.error))
      }

      finalPayment = confirmed.payment
    }

    if (paymentMode === "file" && finalPayment.status !== "paid") {
      return reply.code(402).send(economicError("payment_not_confirmed"))
    }

    const consumedOk = consume(ref)
    if (!consumedOk) return reply.code(402).send(economicError("payment_already_used"))

    const body = req.body as any

    const result = scoreResponse({
      prompt: body?.prompt ?? "",
      response: body?.response ?? "",
      domain: body?.domain ?? "general"
    })

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