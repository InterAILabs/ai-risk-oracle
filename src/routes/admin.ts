import { FastifyPluginAsync } from "fastify"
import { getAdminStats, listAdminAccounts } from "../payments/fileStore.js"
import { requireAdmin } from "../lib/adminauth.js"

export const adminRoute: FastifyPluginAsync = async (app) => {
  app.get("/admin/stats", async (req, reply) => {
    if (!requireAdmin(req, reply)) return

    return {
      ok: true,
      service: "ai-risk-oracle",
      version: process.env.ORACLE_ENGINE_VERSION || "0.0.1",
      payment_mode: process.env.PAYMENT_MODE || "file",
      ...getAdminStats()
    }
  })

  app.get("/admin/accounts", async (req, reply) => {
    if (!requireAdmin(req, reply)) return

    const query = (req.query as { limit?: string | number } | undefined) ?? {}
    const limit = Number(query.limit ?? 50)

    return {
      ok: true,
      accounts: listAdminAccounts(Number.isFinite(limit) ? limit : 50)
    }
  })
}
