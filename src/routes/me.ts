import { FastifyPluginAsync } from "fastify"
import {
  getAccountBalance,
  resolveAccountByApiKey
} from "../payments/fileStore.js"
import { extractBearerToken } from "../lib/auth.js"

export const meRoute: FastifyPluginAsync = async (app) => {
  app.get("/me", async (req, reply) => {
    const authHeader = req.headers["authorization"] as string | undefined
    const bearerToken = extractBearerToken(authHeader)

    if (!bearerToken) {
      return reply.code(401).send({
        error: "missing_bearer_token",
        hint: "Provide Authorization: Bearer <api_key>"
      })
    }

    const resolved = resolveAccountByApiKey(bearerToken)

    if (!resolved) {
      return reply.code(401).send({ error: "invalid_api_key" })
    }

    const balance = getAccountBalance(resolved.account_id)

    return {
      ok: true,
      auth_mode: "bearer",
      api_key_id: resolved.api_key_id,
      account: resolved.account,
      balance
    }
  })
}