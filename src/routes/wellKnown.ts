import { FastifyInstance } from "fastify"

import { isReceiptSigningEnabled } from "../lib/signing.js"
import { trackDiscoveryEvent } from "../lib/discovery.js"

export async function wellKnownRoute(app: FastifyInstance) {
  app.get("/.well-known/ai-service.json", async (req) => {
    trackDiscoveryEvent(req, "service_descriptor_view", "/.well-known/ai-service.json")
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
      discovery: {
        service_descriptor: `${baseUrl}/.well-known/ai-service.json`,
        openapi: `${baseUrl}/.well-known/openapi.json`,
        a2a_agent_card: `${baseUrl}/.well-known/agent.json`
      },
      endpoints: {
        health: `${baseUrl}/health`,
        ready: `${baseUrl}/ready`,
        a2a: `${baseUrl}/a2a`,
        a2a_agent_card: `${baseUrl}/.well-known/agent.json`,
        onboard: `${baseUrl}/onboard`,
        me: `${baseUrl}/me`,
        ledger: `${baseUrl}/ledger`,
        usage: `${baseUrl}/usage`,
        verify: `${baseUrl}/verify`,
        verify_batch: `${baseUrl}/verify/batch`,
        trust_receipts: `${baseUrl}/trust/receipts`,
        trust_receipt_get: `${baseUrl}/trust/receipts/{receiptId}`,
        trust_verify_signature: `${baseUrl}/trust/verify-signature`,
        trust_receipt_schema: `${baseUrl}/schemas/trust-receipt.json`,
        trust_receipt_public_schema: `${baseUrl}/schemas/trust-receipt-public.json`,
        verify_result_schema: `${baseUrl}/schemas/verify-result.json`,
        topup_create: `${baseUrl}/topup/create`,
        topup_confirm: `${baseUrl}/topup/confirm`,
        topup_status: `${baseUrl}/topup/{topupId}`,
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
          ...(process.env.DEV_TOPUP_ENABLED === "true"
            ? { dev_credit_endpoint: "/topup/dev/credit" }
            : {})
        },
        idempotency: {
          supported: true,
          header: "X-Idempotency-Key",
          applies_to: ["/verify", "/verify/batch"]
        },
        trust: {
          receipts_endpoint: "/trust/receipts",
          receipt_lookup_endpoint: "/trust/receipts/{receiptId}",
          verify_signature_endpoint: "/trust/verify-signature",
          receipt_schema_endpoint: "/schemas/trust-receipt.json",
          receipt_lookup_schema_endpoint: "/schemas/trust-receipt-public.json",
          verify_result_schema_endpoint: "/schemas/verify-result.json",
          signature_algorithm: "hmac-sha256",
          signing_enabled: isReceiptSigningEnabled()
        }
      },
      schemas: {
        trust_receipt: `${baseUrl}/schemas/trust-receipt.json`,
        trust_receipt_public: `${baseUrl}/schemas/trust-receipt-public.json`,
        verify_result: `${baseUrl}/schemas/verify-result.json`
      },
      agent_protocols: {
        a2a: {
          supported: true,
          agent_card: `${baseUrl}/.well-known/agent.json`,
          rpc_endpoint: `${baseUrl}/a2a`,
          supported_methods: ["message/send"],
          skills: ["verify_response", "verify_batch"]
        },
        mcp: {
          supported: false
        }
      },
      integration_flow: [
        "1. POST /onboard to obtain an API key",
        "2. Optionally fund account via /topup/dev/credit (dev) or /topup/create + /topup/confirm (onchain)",
        "3. Call /verify or /verify/batch with Authorization: Bearer <api_key>",
        "4. Inspect /me, /ledger, /usage, and /trust/receipts for account state and trust evidence",
        "5. Optionally resolve /trust/receipts/{receiptId} for canonical public receipt lookup"
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
            Authorization: "Bearer <api_key>",
            "Content-Type": "application/json",
            "X-Idempotency-Key": "example-1"
          },
          body: {
            prompt: "What is the capital of France?",
            response: "Paris",
            domain: "general"
          }
        },
        verify_batch_example: {
          method: "POST",
          path: "/verify/batch",
          headers: {
            Authorization: "Bearer <api_key>",
            "Content-Type": "application/json",
            "X-Idempotency-Key": "batch-example-1"
          },
          body: {
            items: [
              {
                prompt: "What is the capital of France?",
                response: "Paris",
                domain: "general"
              },
              {
                prompt: "What is 2 + 2?",
                response: "4",
                domain: "math"
              }
            ]
          }
        }
      },
      limits: {
        batch_max_items: 100
      },
      runtime: {
        payment_mode: process.env.PAYMENT_MODE || "file",
        readiness_probe: "/ready",
        health_probe: "/health"
      },
      sla: {
        target_p95_ms: 250
      }
    }
  })
}
