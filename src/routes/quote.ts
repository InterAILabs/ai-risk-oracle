import { FastifyPluginAsync } from "fastify"
import { randomUUID } from "crypto"
import { createQuote } from "../payments/fileStore"

const PRICING: Record<string, string> = {
  fast: "0.0006"
}

const TTL_MS = 10 * 60 * 1000

export const quoteRoute: FastifyPluginAsync = async (app) => {
  app.post("/quote", async (req, reply) => {
    const body = req.body as any

    const mode: string = body?.mode ?? "fast"

    if (!(mode in PRICING)) {
      return reply.code(400).send({
        error: "invalid_mode"
      })
    }

    const ref = randomUUID()

    const pay_to = process.env.PAY_TO || "0x0000000000000000000000000000000000000000"

    createQuote(ref, PRICING[mode], pay_to, TTL_MS)

    return {
      payment_reference: ref,
      amount: PRICING[mode],
      currency: "USDC",
      chain: "base",
      pay_to,
      expires_at_ms: Date.now() + TTL_MS
    }
  })
}