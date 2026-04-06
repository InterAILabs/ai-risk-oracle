import { FastifyPluginAsync } from "fastify"
import { randomUUID } from "crypto"
import { creditAccount, getAccount, getAccountBalance } from "../payments/fileStore.js"
import { requireAdmin } from "../lib/adminauth.js"

export const balanceRoute: FastifyPluginAsync = async (app) => {
  app.get("/accounts/:accountId/balance", async (req, reply) => {
  if (!requireAdmin(req, reply)) return
    const params = req.params as any
    const accountId = String(params.accountId)

    const account = getAccount(accountId)
    if (!account) {
      return reply.code(404).send({ error: "account_not_found" })
    }

    const balance = getAccountBalance(accountId)

    return {
      ok: true,
      account,
      balance
    }
  })

  app.post("/accounts/:accountId/credit", async (req, reply) => {
    const expectedAdminToken = process.env.ADMIN_TOKEN
    if (!expectedAdminToken) {
      return reply.code(500).send({ error: "admin_token_not_configured" })
    }

    const admin = req.headers["x-admin-token"]
    if (admin !== expectedAdminToken) {
      return reply.code(403).send({ error: "forbidden" })
    }

    const params = req.params as any
    const body = req.body as any

    const accountId = String(params.accountId)
    const amountMicrousdc = Number(body?.amount_microusdc)

    if (!Number.isInteger(amountMicrousdc) || amountMicrousdc <= 0) {
      return reply.code(400).send({ error: "invalid_amount_microusdc" })
    }

    try {
      const result = creditAccount({
        ledgerId: randomUUID(),
        accountId,
        amountMicrousdc,
        reference: body?.reference ? String(body.reference) : undefined,
        metadata: body?.metadata && typeof body.metadata === "object" ? body.metadata : undefined
      })

      return {
        ok: true,
        result
      }
    } catch (error: any) {
      const msg = String(error?.message || "unknown_error")

      if (msg === "account_not_found") {
        return reply.code(404).send({ error: msg })
      }

      if (msg === "account_not_active" || msg === "invalid_credit_amount") {
        return reply.code(400).send({ error: msg })
      }

      return reply.code(500).send({ error: "credit_failed" })
    }
  })
}