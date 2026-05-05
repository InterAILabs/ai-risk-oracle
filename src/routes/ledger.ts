import { FastifyPluginAsync } from "fastify"
import {
  getAccountBalance,
  listLedgerForAccount
} from "../payments/fileStore.js"
import { requireResolvedBearerAccount } from "../auth/resolveBearerAccount.js"

export const ledgerRoute: FastifyPluginAsync = async (app) => {
  app.get("/ledger", async (req, reply) => {
    const resolved = requireResolvedBearerAccount(req, reply)
    if (!resolved) return

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
