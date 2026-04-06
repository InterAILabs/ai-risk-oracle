import { FastifyPluginAsync } from "fastify"
import { getPaymentStats } from "../payments/fileStore.js"
import { requireAdmin } from "../lib/adminauth.js"

export const statsRoute: FastifyPluginAsync = async (app) => {
  app.get("/stats", async (req, reply) => {
    if (!requireAdmin(req, reply)) return

    return {
      ok: true,
      service: "ai-risk-oracle",
      version: process.env.ORACLE_ENGINE_VERSION || "0.0.1",
      uptime_seconds: Math.floor(process.uptime()),
      payments: getPaymentStats(),
      payment_mode: process.env.PAYMENT_MODE || "file"
    }
  })
}