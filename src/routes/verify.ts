import { FastifyPluginAsync } from "fastify"
import { getPayment, consume, markPaid, isTxUsed, markTxUsed } from "../payments/fileStore.js"
import { scoreResponse } from "../engine/score.js"
import { verifyUsdcPaymentOnBaseRpc } from "../payments/onchainBaseUsdc.js"

export const verifyRoute: FastifyPluginAsync = async (app) => {
  app.post("/verify", async (req, reply) => {
    const ref = req.headers["x-payment-ref"] as string | undefined
    if (!ref) return reply.code(402).send({ error: "payment_required" })

    const payment = getPayment(ref)
    if (!payment) return reply.code(402).send({ error: "invalid_payment_reference" })
    if (payment.status === "expired") return reply.code(402).send({ error: "payment_expired" })
    if (payment.status === "consumed") return reply.code(402).send({ error: "payment_already_used" })

    // --- ONCHAIN MODE (tx hash) ---
    const tx = req.headers["x-payment-tx"] as string | undefined
    const paymentMode = (process.env.PAYMENT_MODE || "file") as "file" | "onchain"

    if (paymentMode === "onchain") {
      if (!tx) return reply.code(402).send({ error: "payment_tx_required" })
      if (isTxUsed(tx)) return reply.code(402).send({ error: "payment_tx_already_used" })

      const rpcUrl = process.env.BASE_RPC_URL
      if (!rpcUrl) return reply.code(500).send({ error: "missing_BASE_RPC_URL" })

      const payTo = payment.pay_to as `0x${string}`

      let ok:
  | { ok: true }
  | { ok: false; error: string }

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

    // --- FILE MODE (admin confirm) ---
    if (payment.status !== "paid" && paymentMode === "file") {
      return reply.code(402).send({ error: "payment_not_confirmed" })
    }

    const body = req.body as any
    const result = scoreResponse({
      prompt: body?.prompt ?? "",
      response: body?.response ?? "",
      domain: body?.domain ?? "general"
    })

    // consume (1 pago = 1 verify)
    const consumed = consume(ref)
    if (!consumed) return reply.code(402).send({ error: "payment_not_confirmed" })

    return result
  })
}