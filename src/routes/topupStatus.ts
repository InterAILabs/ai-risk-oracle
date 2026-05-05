import { FastifyPluginAsync } from "fastify"
import { getTopupForAccount } from "../payments/fileStore.js"
import { economicError } from "../lib/httpErrors.js"
import { requireResolvedBearerAccount } from "../auth/resolveBearerAccount.js"

export const topupStatusRoute: FastifyPluginAsync = async (app) => {
  app.get("/topup/:topupId", async (req, reply) => {
    const resolved = requireResolvedBearerAccount(req, reply)
    if (!resolved) return

    const params = req.params as { topupId?: string }
    const topupId = String(params.topupId || "")

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
