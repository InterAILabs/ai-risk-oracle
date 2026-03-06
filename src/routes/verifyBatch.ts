import { FastifyPluginAsync } from "fastify"
import { getPayment, consume } from "../payments/fileStore.js"
import { scoreResponse } from "../engine/score.js"

type BatchItem = {
  prompt: string
  response: string
  domain?: string
}

export const verifyBatchRoute: FastifyPluginAsync = async (app) => {

  app.post("/verify/batch", async (req, reply) => {

    const ref = req.headers["x-payment-ref"] as string | undefined

    if (!ref) {
      return reply.code(402).send({ error: "payment_required" })
    }

    const payment = getPayment(ref)

    if (!payment) {
      return reply.code(402).send({ error: "invalid_payment_reference" })
    }

    if (payment.status !== "paid") {
      return reply.code(402).send({ error: "payment_not_confirmed" })
    }

    const body = req.body as { items: BatchItem[] }

    if (!body?.items || !Array.isArray(body.items)) {
      return reply.code(400).send({ error: "invalid_batch_items" })
    }

    if (body.items.length === 0) {
      return reply.code(400).send({ error: "empty_batch" })
    }

    if (body.items.length > 100) {
      return reply.code(400).send({ error: "batch_limit_exceeded" })
    }

    const results = body.items.map((item) => {

      return scoreResponse({
        prompt: item.prompt ?? "",
        response: item.response ?? "",
        domain: item.domain ?? "general"
      })

    })

    const consumed = consume(ref)

    if (!consumed) {
      return reply.code(402).send({ error: "payment_not_confirmed" })
    }

    return {
      batch_size: results.length,
      results
    }

  })

}