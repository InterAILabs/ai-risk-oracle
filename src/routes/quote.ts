import { FastifyPluginAsync } from "fastify"
import { randomUUID } from "crypto"
import { createQuote } from "../payments/fileStore.js"
import { PRICING, getBatchAmount } from "../config/pricing.js"

const TTL_MS = 10 * 60 * 1000

const CHAIN = "base"
const CHAIN_ID = 8453
const TOKEN = {
  symbol: "USDC",
  decimals: 6,
  address: "0x833589fcd6edb6e08f4c7c32d4f71b54bda02913"
}

export const quoteRoute: FastifyPluginAsync = async (app) => {
  app.post("/quote", async (req, reply) => {
    const body = req.body as any

    const service = String(body?.service ?? "verify")
    if (service !== "verify") {
      return reply.code(400).send({ error: "invalid_service" })
    }

    const mode: string = body?.mode ?? "fast"
    const pay_to = (process.env.PAY_TO ||
      "0x0000000000000000000000000000000000000000") as string

    let amount = PRICING.fast.amount
    let items_count: number | undefined

    if (mode === "batch") {
      items_count = Number(body?.items_count ?? 0)

      if (!Number.isInteger(items_count) || items_count <= 0) {
        return reply.code(400).send({ error: "invalid_items_count" })
      }

      if (items_count > PRICING.batch.max_items) {
        return reply.code(400).send({ error: "batch_limit_exceeded" })
      }

      amount = getBatchAmount(items_count)
    } else if (mode !== "fast") {
      return reply.code(400).send({ error: "invalid_mode" })
    }

    const ref = randomUUID()
    const expiresAt = Date.now() + TTL_MS

    await createQuote(ref, amount, pay_to, TTL_MS)

    return {
      payment_reference: ref,
      service,
      mode,
      amount,
      currency: "USDC",
      chain: CHAIN,
      chain_id: CHAIN_ID,
      token: TOKEN,
      pay_to,
      expires_at_ms: expiresAt,
      ...(mode === "batch" ? { items_count } : {})
    }
  })
}