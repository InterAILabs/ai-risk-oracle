import { FastifyPluginAsync } from "fastify"
import { requireResolvedBearerAccount } from "../auth/resolveBearerAccount.js"
import { getTrustReputationForAccount } from "../payments/fileStore.js"

export const trustReputationRoute: FastifyPluginAsync = async (app) => {
  app.get("/trust/reputation", async (req, reply) => {
    const resolved = requireResolvedBearerAccount(req, reply, {
      missingError: "missing_api_key"
    })
    if (!resolved) return

    const query = (req.query || {}) as { domains_limit?: string | number }
    const limitRaw = Number(query.domains_limit ?? 20)
    const domainsLimit = Number.isFinite(limitRaw)
      ? Math.max(1, Math.min(100, Math.floor(limitRaw)))
      : 20

    return {
      ok: true,
      reputation: getTrustReputationForAccount({
        accountId: resolved.account_id,
        domainsLimit
      })
    }
  })
}
