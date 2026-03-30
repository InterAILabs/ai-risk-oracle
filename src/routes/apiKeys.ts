import { FastifyPluginAsync } from "fastify"
import { randomUUID, randomBytes } from "crypto"
import { createApiKey, getAccount } from "../payments/fileStore.js"

function generateRawApiKey() {
  return `iao_live_${randomBytes(24).toString("hex")}`
}

export const apiKeysRoute: FastifyPluginAsync = async (app) => {
  app.post("/accounts/:accountId/api-keys", async (req, reply) => {
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
    const account = getAccount(accountId)

    if (!account) {
      return reply.code(404).send({ error: "account_not_found" })
    }

    try {
      const rawKey = generateRawApiKey()
      const record = createApiKey({
        id: randomUUID(),
        accountId,
        rawKey,
        name: body?.name ? String(body.name) : undefined
      })

      return {
        ok: true,
        api_key: rawKey,
        record
      }
    } catch (error: any) {
      const msg = String(error?.message || "unknown_error")

      if (msg === "account_not_found") {
        return reply.code(404).send({ error: msg })
      }

      if (msg === "account_not_active") {
        return reply.code(400).send({ error: msg })
      }

      return reply.code(500).send({ error: "api_key_creation_failed" })
    }
  })
}