import { FastifyPluginAsync } from "fastify"
import { randomUUID } from "crypto"
import { getTopup, confirmTopup, creditAccount, getAccountBalance } from "../payments/fileStore.js"
import { verifyUsdcPaymentOnBaseRpc } from "../payments/onchainBaseUsdc.js"

type TopupRecord = {
  id: string
  account_id: string
  amount: string
  pay_to: string
  status: string
  tx_hash: string | null
  created_at: number
  expires_at: number
}

export const topupConfirmRoute: FastifyPluginAsync = async (app) => {
  app.post("/topup/confirm", async (req, reply) => {
    const topupId = req.headers["x-topup-id"] as string | undefined
    const tx = req.headers["x-tx-hash"] as string | undefined

    if (!topupId) {
      return reply.code(400).send({ error: "missing_topup_id" })
    }

    if (!tx) {
      return reply.code(400).send({ error: "missing_tx_hash" })
    }

    const topup = getTopup(topupId) as TopupRecord | undefined

    if (!topup) {
      return reply.code(404).send({ error: "topup_not_found" })
    }

    if (topup.status === "confirmed") {
      const balance = getAccountBalance(topup.account_id)
      return {
        ok: true,
        already_confirmed: true,
        topup_id: topup.id,
        account_id: topup.account_id,
        tx_hash: topup.tx_hash,
        balance
      }
    }

    if (topup.status === "expired") {
      return reply.code(400).send({ error: "topup_expired" })
    }

    if (Date.now() > topup.expires_at) {
      return reply.code(400).send({ error: "topup_expired" })
    }

    const rpcUrl = process.env.BASE_RPC_URL
    if (!rpcUrl) {
      return reply.code(500).send({ error: "missing_BASE_RPC_URL" })
    }

    const ok = await verifyUsdcPaymentOnBaseRpc({
      txHash: tx as `0x${string}`,
      payTo: topup.pay_to as `0x${string}`,
      amount: topup.amount,
      rpcUrl
    })

    if (!ok.ok) {
      return reply.code(402).send({ error: ok.error })
    }

    confirmTopup(topupId, tx)

    const microusdc = Math.round(Number(topup.amount) * 1_000_000)

    creditAccount({
      ledgerId: randomUUID(),
      accountId: topup.account_id,
      amountMicrousdc: microusdc,
      reference: topupId,
      metadata: {
        source: "topup",
        tx_hash: tx
      }
    })

    const balance = getAccountBalance(topup.account_id)

    return {
      ok: true,
      already_confirmed: false,
      topup_id: topup.id,
      account_id: topup.account_id,
      credited_microusdc: microusdc,
      credited_usdc: topup.amount,
      tx_hash: tx,
      balance
    }
  })
}