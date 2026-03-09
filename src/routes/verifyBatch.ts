import { FastifyPluginAsync } from "fastify"
import {
  getPayment,
  consume,
  markPaid,
  isTxUsed,
  markTxUsed
} from "../payments/fileStore.js"
import { scoreResponse } from "../engine/score.js"
import { verifyUsdcPaymentOnBaseRpc } from "../payments/onchainBaseUsdc.js"

type BatchItem = {
  prompt: string
  response: string
  domain?: string
}

const ENGINE_VERSION = process.env.ORACLE_ENGINE_VERSION || "0.0.1"

export const verifyBatchRoute: FastifyPluginAsync = async (app) => {
  app.post("/verify/batch", async (req, reply) => {
    const ref = req.headers["x-payment-ref"] as string | undefined
    if (!ref) return reply.code(402).send({ error: "payment_required" })

    const payment = getPayment(ref)
    if (!payment) return reply.code(402).send({ error: "invalid_payment_reference" })
    if (payment.status === "expired") return reply.code(402).send({ error: "payment_expired" })
    if (payment.status === "consumed") return reply.code(402).send({ error: "payment_already_used" })

    const tx = req.headers["x-payment-tx"] as string | undefined
    const paymentMode = (process.env.PAYMENT_MODE || "file") as "file" | "onchain"

    if (paymentMode === "onchain") {
      if (!tx) return reply.code(402).send({ error: "payment_tx_required" })
      if (isTxUsed(tx)) return reply.code(402).send({ error: "payment_tx_already_used" })

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

      markTxUsed(tx, ref)
      markPaid(ref, tx)
    }

    if (payment.status !== "paid" && paymentMode === "file") {
      return reply.code(402).send({ error: "payment_not_confirmed" })
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

    const consumed = consume(ref)
    if (!consumed) return reply.code(402).send({ error: "payment_not_confirmed" })

    reply.header("X-Oracle-Cost", payment.amount)
    reply.header("X-Oracle-Currency", "USDC")
    reply.header("X-Oracle-Engine-Version", ENGINE_VERSION)

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