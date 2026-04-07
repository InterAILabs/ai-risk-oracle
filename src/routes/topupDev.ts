import { FastifyPluginAsync } from "fastify"
import { randomUUID } from "crypto"
import {
  creditAccount,
  getAccount,
  getAccountBalance,
  resolveAccountByApiKey
} from "../payments/fileStore.js"
import { extractBearerToken } from "../lib/auth.js"

export const topupDevRoute: FastifyPluginAsync = async (app) => {
  app.post("/topup/dev/credit", async (req, reply) => {
    const enabled = String(process.env.DEV_TOPUP_ENABLED || "false").toLowerCase()
    if (!["true", "1", "yes", "on"].includes(enabled)) {
      return reply.code(404).send({ error: "dev_topup_disabled" })
    }

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

    const amountUsdc = String(body?.amount_usdc ?? "0.01")
    const amountMicrousdc = Math.round(Number(amountUsdc) * 1_000_000)

    if (!Number.isFinite(amountMicrousdc) || amountMicrousdc <= 0) {
      return reply.code(400).send({ error: "invalid_amount_usdc" })
    }

    const ledgerId = randomUUID()
    const reference = body?.reference ? String(body.reference) : `dev-topup:${randomUUID()}`

    creditAccount({
      ledgerId,
      accountId,
      amountMicrousdc,
      reference,
      metadata: {
        source: "dev_topup",
        note: "Local development balance credit"
      }
    })

    const balance = getAccountBalance(accountId)

    return {
      ok: true,
      credited_usdc: amountUsdc,
      credited_microusdc: amountMicrousdc,
      account_id: accountId,
      balance
    }
  })
}