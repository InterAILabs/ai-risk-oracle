import { FastifyPluginAsync } from "fastify"
import { randomUUID } from "crypto"
import {
  getPayment,
  consume,
  confirmOnchainPayment,
  getAccount,
  resolveAccountByApiKey
} from "../payments/fileStore.js"
import { verifyUsdcPaymentOnBaseRpc } from "../payments/onchainBaseUsdc.js"
import { getBatchAmount } from "../config/pricing.js"
import { extractBearerToken } from "../lib/auth.js"
import { trackServiceEvent } from "../lib/discovery.js"
import { economicError } from "../lib/httpErrors.js"
import {
  buildInsufficientBalanceDetails,
  chargeAndRecordUsage,
  ENGINE_VERSION,
  ORACLE_SIGNALS_VERSION,
  runBatchVerification,
  TRUST_SIGNING_ENABLED,
  usdcAmountToMicrousdc
} from "../services/verificationFlow.js"

type BatchItem = {
  prompt: string
  response: string
  domain?: string
}

export const verifyBatchRoute: FastifyPluginAsync = async (app) => {
  app.post("/verify/batch", async (req, reply) => {
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

    const body = req.body as { items?: BatchItem[] }

    if (!body?.items || !Array.isArray(body.items)) {
      return reply.code(400).send(economicError("invalid_batch_items"))
    }

    if (body.items.length === 0) {
      return reply.code(400).send(economicError("empty_batch"))
    }

    if (body.items.length > 100) {
      return reply.code(400).send(
        economicError("batch_limit_exceeded", { max_items: 100 })
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

      const batchAmount = getBatchAmount(body.items.length)
      const costMicrousdc = usdcAmountToMicrousdc(batchAmount)
      const usageId = randomUUID()
      const debit = chargeAndRecordUsage({
        usageId,
        accountId: resolved.account_id,
        service: "verify_batch",
        costUsdc: batchAmount,
        reference: idempotencyKey
      })

      if (!debit.ok) {
        if (debit.error === "insufficient_balance") {
          return reply.code(402).send(
            economicError("insufficient_balance", {
              ...buildInsufficientBalanceDetails({
              service: "verify_batch",
              costMicrousdc,
              costUsdc: batchAmount,
              balanceMicrousdc: Number(debit.balance_microusdc ?? 0),
              batchSize: body.items.length,
              includeDevCreditUrl: true
            })
            })
          )
        }

        return reply.code(402).send(economicError(String(debit.error)))
      }

      const verification = runBatchVerification(body.items, {
        accountId: resolved.account_id,
        usageId,
        paymentRef: null
      })

      reply.header("X-Oracle-Auth-Mode", "bearer")
      reply.header("X-Oracle-Billing-Mode", "account")
      reply.header("X-Oracle-Cost", batchAmount)
      reply.header("X-Oracle-Cost-MicroUSDC", String(debit.billed_cost_microusdc))
      reply.header("X-Oracle-Currency", "USDC")
      reply.header("X-Oracle-Engine-Version", ENGINE_VERSION)
      reply.header("X-Oracle-Latency-Ms", String(verification.maxLatencyMs))
      reply.header("X-Oracle-Remaining-Balance-MicroUSDC", String(debit.remaining_balance_microusdc))
      reply.header("X-Oracle-Remaining-Balance-USDC", debit.remaining_balance_usdc)

      if (debit.idempotent_replay) {
        reply.header("X-Oracle-Idempotent-Replay", "true")
      }

      req.log.info({
        event: "verify_batch_billed",
        auth_mode: "bearer",
        account_id: resolved.account_id,
        api_key_id: resolved.api_key_id,
        usage_id: usageId,
        service: "verify_batch",
        batch_size: body.items.length,
        cost_microusdc: debit.billed_cost_microusdc,
        remaining_balance_microusdc: debit.remaining_balance_microusdc,
        remaining_balance_usdc: debit.remaining_balance_usdc,
        idempotency_key: idempotencyKey ?? null,
        idempotent_replay: debit.idempotent_replay ?? false
      })

      trackServiceEvent(req, "verify_batch_success", "/verify/batch")

      return {
        ok: true,
        batch_size: verification.results.length,
        billed: {
          mode: "account",
          cost_usdc: batchAmount,
          cost_microusdc: debit.billed_cost_microusdc,
          remaining_balance_usdc: debit.remaining_balance_usdc,
          remaining_balance_microusdc: debit.remaining_balance_microusdc
        },
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
      } catch (err: unknown) {
        const msg =
          err instanceof Error ? err.message : String(err ?? "")
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

    const verification = runBatchVerification(body.items, {
      accountId: null,
      usageId: null,
      paymentRef: ref
    })

    const consumedOk = consume(ref)
    if (!consumedOk) return reply.code(402).send(economicError("payment_already_used"))

    reply.header("X-Oracle-Billing-Mode", "payment_reference")
    reply.header("X-Oracle-Cost", finalPayment.amount)
    reply.header("X-Oracle-Currency", "USDC")
    reply.header("X-Oracle-Engine-Version", ENGINE_VERSION)
    reply.header("X-Oracle-Latency-Ms", String(verification.maxLatencyMs))

    trackServiceEvent(req, "verify_batch_success", "/verify/batch")

    return {
      ok: true,
      batch_size: verification.results.length,
      billed: {
        mode: "payment_reference",
        cost_usdc: finalPayment.amount
      },
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
}
