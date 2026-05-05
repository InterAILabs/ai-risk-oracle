import { FastifyPluginAsync } from "fastify"
import { randomUUID, randomBytes } from "crypto"
import {
  createApiKey,
  getAccount,
  revokeApiKey
} from "../payments/fileStore.js"
import { requireAdmin } from "../lib/adminauth.js"

function generateRawApiKey() {
  return `iao_live_${randomBytes(24).toString("hex")}`
}

export const apiKeysRoute: FastifyPluginAsync = async (app) => {
  app.post("/accounts/:accountId/api-keys", async (req, reply) => {
    if (!requireAdmin(req, reply)) return
    const params = req.params as { accountId?: string }
    const body = (req.body as { name?: string } | undefined) ?? {}

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
        name: body.name ? String(body.name) : undefined
      })

      return {
        ok: true,
        api_key: rawKey,
        record
      }
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : "unknown_error"

      if (msg === "account_not_found") {
        return reply.code(404).send({ error: msg })
      }

      if (msg === "account_not_active") {
        return reply.code(400).send({ error: msg })
      }

      return reply.code(500).send({ error: "api_key_creation_failed" })
    }
  })

  app.post("/accounts/:accountId/api-keys/:apiKeyId/revoke", async (req, reply) => {
    if (!requireAdmin(req, reply)) return
    const params = req.params as { accountId?: string; apiKeyId?: string }
    const accountId = String(params.accountId)
    const apiKeyId = String(params.apiKeyId)

    const account = getAccount(accountId)

    if (!account) {
      return reply.code(404).send({ error: "account_not_found" })
    }

    try {
      const record = revokeApiKey(accountId, apiKeyId)

      return {
        ok: true,
        record
      }
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : "unknown_error"

      if (msg === "api_key_not_found") {
        return reply.code(404).send({ error: msg })
      }

      return reply.code(500).send({ error: "api_key_revoke_failed" })
    }
  })
}
