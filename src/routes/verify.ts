// src/routes/verify.ts
import { FastifyInstance } from "fastify"
import { scoreResponse } from "../engine/score.js"
import { isPaid, markPaid, getQuote } from "../payments/fileStore.js"
import { verifyUsdcPaymentOnBaseRpc } from "../payments/onchainBaseUsdc.js"

const PAYMENTS_REQUIRED = process.env.PAYMENTS_REQUIRED === "true"
const PAYMENT_MODE = (process.env.PAYMENT_MODE || "file") as "file" | "onchain"

const BASE_RPC_URL = process.env.BASE_RPC_URL || ""
const USDC_BASE_ADDRESS = (process.env.USDC_BASE_ADDRESS || "") as `0x${string}`
const PAY_TO = (process.env.PAY_TO || "") as `0x${string}`

export async function verifyRoute(app: FastifyInstance) {
  app.post("/verify", async (req: any, reply) => {
    const t0 = performance.now()

    const { prompt, response, domain } = (req.body ?? {}) as {
      prompt?: unknown
      response?: unknown
      domain?: unknown
    }

    if (typeof prompt !== "string" || prompt.trim().length === 0) {
      return reply.code(400).send({ error: "prompt is required" })
    }
    if (typeof response !== "string" || response.trim().length === 0) {
      return reply.code(400).send({ error: "response is required" })
    }

    // ---- Payments gate ----
    if (PAYMENTS_REQUIRED) {
      const ref = req.headers["x-payment-ref"]

      if (typeof ref !== "string" || ref.length < 8) {
        return reply.code(402).send({
          error: "payment required",
          hint:
            PAYMENT_MODE === "onchain"
              ? "Call POST /quote, pay USDC on Base, then retry with headers X-Payment-Ref and X-Payment-Tx"
              : "Call POST /quote, then confirm payment (file mode), then retry with header X-Payment-Ref",
          required_headers:
            PAYMENT_MODE === "onchain"
              ? ["X-Payment-Ref", "X-Payment-Tx"]
              : ["X-Payment-Ref"]
        })
      }

      // cache hit?
      if (!isPaid(ref)) {
        if (PAYMENT_MODE === "file") {
          return reply.code(402).send({
            error: "payment required",
            hint: "Payment reference not paid (or expired). Confirm payment then retry.",
            payment_reference: ref
          })
        }

        // onchain mode requires tx hash
        const tx = req.headers["x-payment-tx"]
        if (typeof tx !== "string" || !tx.startsWith("0x")) {
          return reply.code(402).send({
            error: "payment required",
            hint:
              "Provide X-Payment-Tx (Base tx hash) along with X-Payment-Ref after payment.",
            payment_reference: ref,
            required_header: "X-Payment-Tx"
          })
        }

        const q = getQuote(ref)
        if (!q) return reply.code(404).send({ error: "unknown payment_reference" })
        if (q.status === "expired")
          return reply.code(410).send({ error: "payment_reference expired" })

        if (!BASE_RPC_URL || !USDC_BASE_ADDRESS || !PAY_TO) {
          return reply.code(500).send({
            error: "onchain payment mode not configured",
            missing: {
              BASE_RPC_URL: !BASE_RPC_URL,
              USDC_BASE_ADDRESS: !USDC_BASE_ADDRESS,
              PAY_TO: !PAY_TO
            }
          })
        }

        const vr = await verifyUsdcPaymentOnBaseRpc({
          rpcUrl: BASE_RPC_URL,
          txHash: tx as `0x${string}`,
          usdcAddress: USDC_BASE_ADDRESS,
          payTo: PAY_TO,
          minAmountDecimal: q.amount
        })

        if (!vr.ok) {
          return reply.code(402).send({
            error: "payment required",
            hint: "Tx does not contain a valid USDC payment to pay_to for the quoted amount.",
            reason: vr.reason
          })
        }

        // cache paid
        markPaid(ref)
      }
    }
    // ---- end payments gate ----

    const result = scoreResponse({
      prompt,
      response,
      domain: typeof domain === "string" ? domain : undefined
    })

    const totalLatencyMs = Math.round(performance.now() - t0)

    return {
      ...result,
      analysis: {
        ...result.analysis,
        total_latency_ms: totalLatencyMs
      }
    }
  })
}