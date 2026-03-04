import { FastifyInstance } from "fastify"
import crypto from "node:crypto"
import { createQuote } from "../payments/fileStore.js"

const PAY_TO = "0x0000000000000000000000000000000000000000"
const AMOUNT = "0.0006"

export async function quoteRoute(app: FastifyInstance) {
  app.post("/quote", async () => {
    const payment_reference = crypto.randomUUID()

    createQuote(payment_reference, AMOUNT, PAY_TO)

    return {
      estimated_cost: `${AMOUNT} USDC`,
      amount: AMOUNT,
      currency: "USDC",
      chain: "base",
      pay_to: PAY_TO,
      payment_reference,
      mode: "fast",
      latency_estimate_ms: 180
    }
  })
}