import { FastifyPluginAsync } from "fastify"
import { randomUUID } from "crypto"
import { createTopup, getAccount, resolveAccountByApiKey } from "../payments/fileStore.js"
import { extractBearerToken } from "../lib/auth.js"

export const topupCreateRoute: FastifyPluginAsync = async (app) => {
  app.post("/topup/create", async (req, reply) => {
    const body = (req.body as any) ?? {}
    const authHeader = req.headers["authorization"] as string | undefined
    const bearerToken = extractBearerToken(authHeader)

    let accountId = body?.account_id ? String(body.account_id) : ""

    if (!accountId && bearerToken) {
      const resolved = resolveAccountByApiKey(bearerToken)
      if (!resolved) {
        return reply.code(401).send({ error: "invalid_api_key" })
      }
      accountId = resolved.account_id
    }

    if (!accountId) {
      return reply.code(400).send({
        error: "missing_account_id",
        hint: "Provide account_id in body or Authorization: Bearer <api_key>"
      })
    }

    const account = getAccount(accountId)
    if (!account) {
      return reply.code(404).send({ error: "account_not_found" })
    }

    const amount = body?.amount_usdc
      ? String(body.amount_usdc)
      : String(process.env.DEFAULT_RECOMMENDED_TOPUP_USDC || "0.01")

    const id = randomUUID()

    const pay_to = process.env.TOPUP_RECEIVE_ADDRESS
    if (!pay_to) {
      return reply.code(500).send({ error: "missing_TOPUP_RECEIVE_ADDRESS" })
    }

    const expires_at = Date.now() + 45 * 60 * 1000

    createTopup({
      id,
      account_id: accountId,
      amount,
      pay_to,
      expires_at
    })

    return {
      ok: true,
      topup_id: id,
      account_id: accountId,
      amount,
      pay_to,
      chain: "base",
      asset: "USDC",
      created_at: Date.now(),
      expires_at,
      ttl_minutes: Math.round((expires_at - Date.now()) / 60000),
      next_step:
        "Send the exact USDC amount on Base, then call POST /topup/confirm with X-Topup-Id and X-Tx-Hash."
    }
  })
}