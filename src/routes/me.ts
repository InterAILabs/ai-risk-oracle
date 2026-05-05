import { FastifyPluginAsync } from "fastify"
import { getAccountBalance } from "../payments/fileStore.js"
import { requireResolvedBearerAccount } from "../auth/resolveBearerAccount.js"

export const meRoute: FastifyPluginAsync = async (app) => {
  app.get("/me", async (req, reply) => {
    const resolved = requireResolvedBearerAccount(req, reply)
    if (!resolved) return

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
