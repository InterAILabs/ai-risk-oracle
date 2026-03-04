import { FastifyPluginAsync } from "fastify"
import { markPaid } from "../payments/fileStore"

export const payRoute: FastifyPluginAsync = async (app) => {
  app.post("/pay/confirm", async (req, reply) => {

    const admin = req.headers["x-admin-token"]

    if (admin !== process.env.ADMIN_TOKEN) {
      return reply.code(403).send({ error: "forbidden" })
    }

    const body = req.body as any

    if (!body.payment_reference) {
      return reply.code(400).send({ error: "missing_reference" })
    }

    const ok = markPaid(body.payment_reference)

    if (!ok) {
      return reply.code(404).send({ error: "not_found" })
    }

    return { status: "confirmed" }
  })
}