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
import { PRICING } from "../config/pricing.js"
import { extractBearerToken } from "../lib/auth.js"
import { trackServiceEvent } from "../lib/discovery.js"
import { economicError } from "../lib/httpErrors.js"
import {
  buildInsufficientBalanceDetails,
  chargeAndRecordUsage,
  ENGINE_VERSION,
  ORACLE_SIGNALS_VERSION,
  runVerification,
  TRUST_SIGNING_ENABLED
} from "../services/verificationFlow.js"

export const verifyRoute: FastifyPluginAsync = async (app) => {
  app.post("/verify", async (req, reply) => {
    const body =
      (req.body as {
        prompt?: string
        response?: string
        domain?: string
      } | undefined) ?? {}
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

      const usageId = randomUUID()
      const debit = chargeAndRecordUsage({
        usageId,
        accountId: resolved.account_id,
        service: "verify",
        costUsdc: PRICING.fast.amount,
        reference: idempotencyKey
      })

      if (!debit.ok) {
        if (debit.error === "insufficient_balance") {
          return reply.code(402).send(
            economicError(
              "insufficient_balance",
              buildInsufficientBalanceDetails({
                service: "verify",
                costMicrousdc: Math.round(Number(PRICING.fast.amount) * 1_000_000),
                costUsdc: PRICING.fast.amount,
                balanceMicrousdc: Number(debit.balance_microusdc ?? 0)
              })
            )
          )
        }

        return reply.code(402).send(economicError(String(debit.error)))
      }

      const prompt = body?.prompt ?? ""
      const response = body?.response ?? ""
      const domain = body?.domain ?? "general"
      const verification = runVerification({
        prompt,
        response,
        domain,
        accountId: resolved.account_id,
        usageId,
        paymentRef: null
      })

      reply.header("X-Oracle-Auth-Mode", "bearer")
      reply.header("X-Oracle-Billing-Mode", "account")
      reply.header("X-Oracle-Cost", PRICING.fast.amount)
      reply.header("X-Oracle-Cost-MicroUSDC", String(debit.billed_cost_microusdc))
      reply.header("X-Oracle-Currency", "USDC")
      reply.header("X-Oracle-Engine-Version", ENGINE_VERSION)
      reply.header(
        "X-Oracle-Latency-Ms",
        String(
          verification.result.analysis.total_latency_ms ??
            verification.result.analysis.engine_latency_ms ??
            0
        )
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

      trackServiceEvent(req, "verify_success", "/verify")

      return {
        ...verification.result,
        trust_score: verification.trust_score,
        risk_level: verification.risk_level,
        trust_recommended_action: verification.trust_recommended_action,
        confidence_band: verification.confidence_band,
        signals: verification.signals,
        historical_context: verification.historical_context,
        trust_receipt: verification.trust_receipt,
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

    const consumedOk = consume(ref)
    if (!consumedOk) return reply.code(402).send(economicError("payment_already_used"))

    const prompt = body?.prompt ?? ""
    const response = body?.response ?? ""
    const domain = body?.domain ?? "general"
    const verification = runVerification({
      prompt,
      response,
      domain,
      accountId: null,
      usageId: null,
      paymentRef: ref
    })

    reply.header("X-Oracle-Billing-Mode", "payment_reference")
    reply.header("X-Oracle-Cost", finalPayment.amount)
    reply.header("X-Oracle-Currency", "USDC")
    reply.header("X-Oracle-Engine-Version", ENGINE_VERSION)
    reply.header(
      "X-Oracle-Latency-Ms",
      String(
        verification.result.analysis.total_latency_ms ??
          verification.result.analysis.engine_latency_ms ??
          0
      )
    )

    trackServiceEvent(req, "verify_success", "/verify")

    return {
      ...verification.result,
      trust_score: verification.trust_score,
      risk_level: verification.risk_level,
      trust_recommended_action: verification.trust_recommended_action,
      confidence_band: verification.confidence_band,
      signals: verification.signals,
      historical_context: verification.historical_context,
      trust_receipt: verification.trust_receipt,
      oracle: {
        version: ENGINE_VERSION,
        signals_version: ORACLE_SIGNALS_VERSION,
        trust_signing_enabled: TRUST_SIGNING_ENABLED
      }
    }
  })
}
