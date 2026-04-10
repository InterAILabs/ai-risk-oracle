import { FastifyPluginAsync } from "fastify"
import { getTopup, confirmTopupAndCredit, getAccountBalance } from "../payments/fileStore.js"
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

    const allowFakeTopupConfirm =
  String(process.env.ALLOW_FAKE_TOPUP_CONFIRM || "").toLowerCase() === "true"

const fakeConfirmHeader = String(req.headers["x-test-confirm"] || "").toLowerCase()
const useFakeConfirm = allowFakeTopupConfirm && fakeConfirmHeader === "true"

if (!useFakeConfirm) {
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
}

        const result = confirmTopupAndCredit({
      topupId,
      txHash: tx
    })

    if (!result.ok) {
      if (result.error === "topup_tx_already_used") {
        return reply.code(409).send({ error: result.error })
      }

      if (result.error === "topup_expired") {
        return reply.code(400).send({ error: result.error })
      }

      if (result.error === "topup_not_found") {
        return reply.code(404).send({ error: result.error })
      }

      return reply.code(409).send({ error: result.error })
    }

    return {
      ok: true,
      already_confirmed: result.already_confirmed,
      topup_id: result.topup_id,
      account_id: result.account_id,
      credited_microusdc: result.credited_microusdc,
      credited_usdc: result.credited_usdc,
      tx_hash: result.tx_hash,
      balance: result.balance
    }
  })
}