import { FastifyPluginAsync } from "fastify"
import { markPaid } from "../payments/fileStore.js"
import { requireAdmin } from "../lib/adminauth.js"
import { economicError } from "../lib/httpErrors.js"

export const payRoute: FastifyPluginAsync = async (app) => {
  app.post("/pay/confirm", async (req, reply) => {
    if (!requireAdmin(req, reply)) return
    const body = (req.body as { payment_reference?: string } | undefined) ?? {}

    if (!body.payment_reference) {
      return reply.code(400).send(economicError("missing_reference"))
    }

    const ok = markPaid(String(body.payment_reference))

    if (!ok) {
      return reply.code(404).send(economicError("not_found_or_not_confirmable"))
    }

    return { status: "confirmed" }
  })
}
