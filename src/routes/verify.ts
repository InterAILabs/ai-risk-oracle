import { FastifyPluginAsync } from "fastify"
import { getPayment, consume } from "../payments/fileStore"
import { scoreResponse } from "../engine/score"

export const verifyRoute: FastifyPluginAsync = async (app) => {
  app.post("/verify", async (req, reply) => {

    const ref = req.headers["x-payment-ref"] as string

    if (!ref) {
      return reply.code(402).send({
        error: "payment_required"
      })
    }

    const payment = getPayment(ref)

    if (!payment) {
      return reply.code(402).send({
        error: "invalid_payment_reference"
      })
    }

    if (payment.status === "expired") {
      return reply.code(402).send({
        error: "payment_expired"
      })
    }

    if (payment.status === "consumed") {
      return reply.code(402).send({
        error: "payment_already_used"
      })
    }

    if (payment.status !== "paid") {
      return reply.code(402).send({
        error: "payment_not_confirmed"
      })
    }

    const body = req.body as any

    const result = scoreResponse({
    prompt: body?.prompt ?? "",
    response: body?.response ?? "",
    domain: body?.domain ?? "general"
   })

    consume(ref)

    return result
  })
}