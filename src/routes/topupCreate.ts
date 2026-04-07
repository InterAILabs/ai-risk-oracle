import { FastifyPluginAsync } from "fastify"
import { randomUUID } from "crypto"
import { createTopup, getAccount } from "../payments/fileStore.js"

export const topupCreateRoute: FastifyPluginAsync = async (app) => {
  app.post("/topup/create", async (req, reply) => {
    const body = req.body as any

    const account = getAccount(body.account_id)
    if (!account) {
      return reply.code(404).send({ error: "account_not_found" })
    }

    const id = randomUUID()

    const pay_to = process.env.TOPUP_RECEIVE_ADDRESS
    if (!pay_to) {
      return reply.code(500).send({ error: "missing_TOPUP_RECEIVE_ADDRESS" })
    }

    const expires_at = Date.now() + 45 * 60 * 1000

    createTopup({
      id,
      account_id: body.account_id,
      amount: body.amount_usdc,
      pay_to,
      expires_at
    })

    return {
      topup_id: id,
      amount: body.amount_usdc,
      pay_to,
      chain: "base",
      expires_at
    }
  })
}