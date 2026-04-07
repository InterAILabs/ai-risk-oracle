import { FastifyPluginAsync } from "fastify"
import {
  getAccountBalance,
  listLedgerForAccount,
  resolveAccountByApiKey
} from "../payments/fileStore.js"
import { extractBearerToken } from "../lib/auth.js"
import { economicError } from "../lib/httpErrors.js"

export const ledgerRoute: FastifyPluginAsync = async (app) => {
  app.get("/ledger", async (req, reply) => {
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

    const query = req.query as { limit?: string | number }
    const limit = Number(query?.limit ?? 20)

    const balance = getAccountBalance(resolved.account_id)
    const entries = listLedgerForAccount(resolved.account_id, limit)

    return {
      ok: true,
      account_id: resolved.account_id,
      balance,
      count: entries.length,
      entries
    }
  })
}