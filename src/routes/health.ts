import { FastifyInstance } from "fastify"

export async function healthRoute(app: FastifyInstance) {
  app.get("/health", async () => {
    return { ok: true, service: "ai-risk-oracle", version: "0.0.1" }
  })
}