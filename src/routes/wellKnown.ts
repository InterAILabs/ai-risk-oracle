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
        me: `${baseUrl}/me`,
        verify: `${baseUrl}/verify`,
        verify_batch: `${baseUrl}/verify/batch`,
        quote: `${baseUrl}/quote`
      },
      auth: {
        primary: {
          type: "bearer_api_key",
          header: "Authorization",
          format: "Bearer <api_key>"
        },
        legacy: {
          type: "payment_reference",
          header: "X-Payment-Ref"
        }
      },
      billing: {
        model: "prepaid_balance_per_request",
        currency: "USDC",
        unit: "microusdc",
        default_verify_cost_usdc: "0.0006",
        supports_idempotency_header: true,
        idempotency_header: "X-Idempotency-Key"
      },
      pricing: {
        currency: "USDC",
        chain: "base",
        payment_mode: process.env.PAYMENT_MODE || "file"
      },
      sla: {
        target_p95_ms: 250
      },
      notes: [
        "Primary integration path: create an account, fund balance, create an API key, then call /verify or /verify/batch with Authorization: Bearer <api_key>.",
        "Use GET /me to inspect account identity and remaining balance.",
        "Legacy quote/pay/verify remains available for compatibility, but is not the primary agent integration path."
      ]
    }
  })
}