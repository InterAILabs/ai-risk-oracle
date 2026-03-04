// src/routes/pay.ts
import { FastifyInstance } from "fastify"
import { confirmPayment } from "../payments/fileStore.js"

const ADMIN_TOKEN = process.env.ADMIN_TOKEN || ""

export async function payRoute(app: FastifyInstance) {
  app.post("/pay/confirm", async (req: any, reply) => {
    // En prod esto debe estar protegido
    const token = req.headers["x-admin-token"]

    if (!ADMIN_TOKEN) {
      return reply.code(500).send({
        error: "admin_token_not_configured",
        hint: "Set ADMIN_TOKEN in environment/secrets to enable /pay/confirm safely."
      })
    }

    if (typeof token !== "string" || token !== ADMIN_TOKEN) {
      return reply.code(403).send({
        error: "forbidden",
        hint: "Missing or invalid X-Admin-Token."
      })
    }

    const { payment_reference } = req.body ?? {}
    if (typeof payment_reference !== "string" || payment_reference.length < 8) {
      return reply.code(400).send({ error: "payment_reference is required" })
    }

    const out = confirmPayment(payment_reference)
    return out
  })
}