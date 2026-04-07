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

      description:
        "AI response risk and consistency oracle with prepaid per-request billing, designed for autonomous agents.",

      endpoints: {
        onboard: `${baseUrl}/onboard`,
        me: `${baseUrl}/me`,
        verify: `${baseUrl}/verify`,
        verify_batch: `${baseUrl}/verify/batch`,
        topup_create: `${baseUrl}/topup/create`,
        topup_confirm: `${baseUrl}/topup/confirm`,
        topup_dev_credit: `${baseUrl}/topup/dev/credit`
      },

      auth: {
        primary: {
          type: "bearer_api_key",
          header: "Authorization",
          format: "Bearer <api_key>",
          obtained_via: "POST /onboard"
        }
      },

      billing: {
        model: "prepaid_balance_per_request",
        currency: "USDC",
        chain: "base",
        unit: "microusdc",

        default_costs: {
          verify: process.env.DEFAULT_VERIFY_COST_USDC || "0.0006",
          verify_batch_example_2_items: "0.001"
        },

        topup: {
          method: "onchain",
          asset: "USDC",
          chain: "base",
          create_endpoint: "/topup/create",
          confirm_endpoint: "/topup/confirm",
          dev_credit_endpoint: "/topup/dev/credit"
        },

        idempotency: {
          supported: true,
          header: "X-Idempotency-Key"
        }
      },

      integration_flow: [
        "1. POST /onboard to obtain an API key",
        "2. Optionally fund account via /topup/dev/credit (dev) or /topup/create + /topup/confirm (onchain)",
        "3. Call /verify or /verify/batch with Authorization: Bearer <api_key>"
      ],

      quickstart: {
        onboard: {
          method: "POST",
          path: "/onboard"
        },
        verify_example: {
          method: "POST",
          path: "/verify",
          headers: {
            "Authorization": "Bearer <api_key>",
            "Content-Type": "application/json",
            "X-Idempotency-Key": "example-1"
          },
          body: {
            prompt: "What is the capital of France?",
            response: "Paris",
            domain: "general"
          }
        }
      },

      limits: {
        batch_max_items: 100
      },

      sla: {
        target_p95_ms: 250
      }
    }
  })
}