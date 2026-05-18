import { FastifyPluginAsync, FastifyRequest } from "fastify"
import { isReceiptSigningEnabled } from "../lib/signing.js"
import { trackDiscoveryEvent } from "../lib/discovery.js"
import { buildPublicPricing } from "../lib/publicMeta.js"

export const discoveryBundleRoute: FastifyPluginAsync = async (app) => {
  async function discoveryBundle(req: FastifyRequest) {
    const baseUrl =
      (req.headers["x-forwarded-proto"] ? String(req.headers["x-forwarded-proto"]) : "https") +
      "://" +
      String(req.headers.host)

    return {
      name: "InterAI Risk Oracle Discovery Bundle",
      service: {
        id: "interai-risk-oracle",
        name: "InterAI Risk Oracle",
        version: "0.0.1",
        base_url: baseUrl
      },
      runtime: {
        payment_mode: process.env.PAYMENT_MODE || "file",
        trust_signing_enabled: isReceiptSigningEnabled(),
        health_url: `${baseUrl}/health`,
        readiness_url: `${baseUrl}/ready`
      },
      discovery: {
        service_descriptor_url: `${baseUrl}/.well-known/ai-service.json`,
        openapi_url: `${baseUrl}/.well-known/openapi.json`,
        agent_card_url: `${baseUrl}/.well-known/agent.json`,
        pricing_url: `${baseUrl}/pricing`,
        schemas: {
          trust_receipt: `${baseUrl}/schemas/trust-receipt.json`,
          trust_receipt_public: `${baseUrl}/schemas/trust-receipt-public.json`,
          verify_result: `${baseUrl}/schemas/verify-result.json`
        }
      },
      interfaces: {
        http_api: {
          verify: `${baseUrl}/verify`,
          verify_batch: `${baseUrl}/verify/batch`,
          onboard: `${baseUrl}/onboard`,
          me: `${baseUrl}/me`,
          ledger: `${baseUrl}/ledger`,
          usage: `${baseUrl}/usage`,
          pricing: `${baseUrl}/pricing`,
          trust_receipts: `${baseUrl}/trust/receipts`,
          trust_reputation: `${baseUrl}/trust/reputation`,
          trust_receipt_lookup: `${baseUrl}/trust/receipts/{receiptId}`,
          trust_verify_signature: `${baseUrl}/trust/verify-signature`
        },
        a2a: {
          endpoint: `${baseUrl}/a2a`,
          method: "message/send",
          agent_card_url: `${baseUrl}/.well-known/agent.json`,
          skills: ["verify_response", "verify_batch"]
        },
        mcp: {
          endpoint: `${baseUrl}/mcp`,
          methods: [
            "initialize",
            "tools/list",
            "tools/call",
            "resources/list",
            "resources/read",
            "prompts/list",
            "prompts/get"
          ]
        }
      },
      samples: {
        pricing: buildPublicPricing(baseUrl),
        verify: {
          prompt: "What is the capital of France?",
          response: "Paris",
          domain: "general"
        },
        verify_batch: {
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
        },
        a2a_message_send: {
          jsonrpc: "2.0",
          id: "example-1",
          method: "message/send",
          params: {
            message: {
              role: "user",
              messageId: "example-message-1",
              parts: [
                {
                  kind: "data",
                  data: {
                    prompt: "What is the capital of France?",
                    response: "Paris",
                    domain: "general"
                  }
                }
              ]
            },
            metadata: {
              idempotency_key: "example-1"
            }
          }
        },
        mcp_initialize: {
          jsonrpc: "2.0",
          id: "init-1",
          method: "initialize",
          params: {
            protocolVersion: "2025-11-25",
            capabilities: {},
            clientInfo: {
              name: "example-client",
              version: "0.0.1"
            }
          }
        },
        mcp_tool_call_verify: {
          jsonrpc: "2.0",
          id: "verify-1",
          method: "tools/call",
          params: {
            name: "oracle.verify_response",
            arguments: {
              prompt: "What is the capital of France?",
              response: "Paris",
              domain: "general",
              idempotency_key: "example-verify-1"
            }
          }
        }
      }
    }
  }

  app.get("/.well-known/discovery-bundle.json", async (req) => {
    trackDiscoveryEvent(req, "discovery_bundle_view", "/.well-known/discovery-bundle.json")
    return discoveryBundle(req)
  })

  app.get("/discovery.json", async (req) => {
    trackDiscoveryEvent(req, "discovery_bundle_alias_view", "/discovery.json")
    return discoveryBundle(req)
  })
}
