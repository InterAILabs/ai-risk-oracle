// src/routes/wellKnown.ts
import { FastifyInstance } from "fastify"

export async function wellKnownRoute(app: FastifyInstance) {
  app.get("/.well-known/ai-service.json", async (req) => {
    const baseUrl =
      (req.headers["x-forwarded-proto"] ? String(req.headers["x-forwarded-proto"]) : "https") +
      "://" +
      String(req.headers.host)

    return {
      name: "InterAI Risk Oracle",
      id: "interai-risk-oracle",
      version: "0.0.1",
      endpoints: {
        quote: `${baseUrl}/quote`,
        verify: `${baseUrl}/verify`
      },
      auth: {
        payments_required: process.env.PAYMENTS_REQUIRED === "true",
        scheme: "402+X-Payment-Ref"
      },
      pricing: {
        currency: "USDC",
        chain: "base",
        mode: process.env.PAYMENT_MODE || "file",
        quote_amount_default: "0.0006"
      },
      sla: {
        target_p95_ms: 250
      },
      notes: [
        "Call POST /quote to receive payment_reference, then pay/confirm in file-mode or onchain in future.",
        "Then call POST /verify with header X-Payment-Ref."
      ]
    }
  })
}