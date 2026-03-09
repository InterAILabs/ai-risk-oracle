import { FastifyPluginAsync } from "fastify"
import { getPaymentStats } from "../payments/fileStore.js"

export const statsRoute: FastifyPluginAsync = async (app) => {
  app.get("/stats", async () => {
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