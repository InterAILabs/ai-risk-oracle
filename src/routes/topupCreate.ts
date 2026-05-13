import { FastifyPluginAsync } from "fastify"
import { randomUUID } from "crypto"
import { createTopup } from "../payments/fileStore.js"
import { trackServiceEvent } from "../lib/discovery.js"
import { economicError } from "../lib/httpErrors.js"
import { resolveAccountIdFromBodyOrBearer } from "../auth/resolveBearerAccount.js"

export const topupCreateRoute: FastifyPluginAsync = async (app) => {
  app.post("/topup/create", async (req, reply) => {
    const body =
      (req.body as { account_id?: string; amount_usdc?: string } | undefined) ?? {}
    if (!body.account_id && !req.headers.authorization) {
      return reply.code(400).send(
        economicError("missing_account_id", {
          hint: "Provide account_id in body or Authorization: Bearer <api_key>"
        })
      )
    }

    const target = resolveAccountIdFromBodyOrBearer({ body, req, reply })
    if (!target) {
      return
    }

    const { accountId } = target

    const amount = body.amount_usdc
      ? String(body.amount_usdc)
      : String(process.env.DEFAULT_RECOMMENDED_TOPUP_USDC || "0.01")

    const id = randomUUID()

    const pay_to = process.env.TOPUP_RECEIVE_ADDRESS
    if (!pay_to) {
      return reply.code(500).send(economicError("missing_TOPUP_RECEIVE_ADDRESS"))
    }

    const expires_at = Date.now() + 45 * 60 * 1000

    createTopup({
      id,
      account_id: accountId,
      amount,
      pay_to,
      expires_at
    })

    trackServiceEvent(req, "topup_create_success", "/topup/create")

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
