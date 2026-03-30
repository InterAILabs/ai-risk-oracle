import { FastifyPluginAsync } from "fastify"
import { markPaid } from "../payments/fileStore.js"

export const payRoute: FastifyPluginAsync = async (app) => {
  app.post("/pay/confirm", async (req, reply) => {
    const expectedAdminToken = process.env.ADMIN_TOKEN

    if (!expectedAdminToken) {
      return reply.code(500).send({ error: "admin_token_not_configured" })
    }

    const admin = req.headers["x-admin-token"]

    if (admin !== expectedAdminToken) {
      return reply.code(403).send({ error: "forbidden" })
    }

    const body = req.body as any

    if (!body.payment_reference) {
      return reply.code(400).send({ error: "missing_reference" })
    }

    const ok = markPaid(String(body.payment_reference))

    if (!ok) {
      return reply.code(404).send({ error: "not_found_or_not_confirmable" })
    }

    return { status: "confirmed" }
  })
}