import { FastifyPluginAsync } from "fastify"
import {
  getTopupForAccount,
  resolveAccountByApiKey
} from "../payments/fileStore.js"
import { extractBearerToken } from "../lib/auth.js"
import { economicError } from "../lib/httpErrors.js"

export const topupStatusRoute: FastifyPluginAsync = async (app) => {
  app.get("/topup/:topupId", async (req, reply) => {
    const authHeader = req.headers["authorization"] as string | undefined
    const bearerToken = extractBearerToken(authHeader)

    if (!bearerToken) {
      return reply.code(401).send(
        economicError("missing_bearer_token", {
          hint: "Provide Authorization: Bearer <api_key>"
        })
      )
    }

    const resolved = resolveAccountByApiKey(bearerToken)

    if (!resolved) {
      return reply.code(401).send(economicError("invalid_api_key"))
    }

    const topupId = String((req.params as any).topupId || "")

    if (!topupId) {
      return reply.code(400).send(economicError("missing_topup_id"))
    }

    const topup = getTopupForAccount(topupId, resolved.account_id)

    if (!topup) {
      return reply.code(404).send(economicError("topup_not_found"))
    }

    return {
      ok: true,
      account_id: resolved.account_id,
      topup
    }
  })
}