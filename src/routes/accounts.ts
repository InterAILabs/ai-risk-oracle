import { FastifyPluginAsync } from "fastify"
import { randomUUID } from "crypto"
import { createAccount } from "../payments/fileStore.js"

export const accountsRoute: FastifyPluginAsync = async (app) => {
  app.post("/accounts/create", async (req, reply) => {
    const body = req.body as any
    const accountId = String(body?.account_id ?? randomUUID())
    const name = body?.name ? String(body.name) : undefined

    const account = createAccount(accountId, name)

    return {
      ok: true,
      account
    }
  })
}