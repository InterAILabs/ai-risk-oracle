import { FastifyInstance } from "fastify"
import { isReceiptSigningEnabled } from "../lib/signing.js"

export async function healthRoute(app: FastifyInstance) {
  app.get("/health", async () => {
    return {
      ok: true,
      service: "ai-risk-oracle",
      version: "0.0.1",
      payment_mode: process.env.PAYMENT_MODE || "file",
      trust_signing_enabled: isReceiptSigningEnabled()
    }
  })

  app.get("/ready", async () => {
    return {
      ok: true,
      ready: true,
      service: "ai-risk-oracle",
      version: "0.0.1"
    }
  })
}
