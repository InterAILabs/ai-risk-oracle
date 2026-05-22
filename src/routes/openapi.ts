import { FastifyInstance, FastifyRequest } from "fastify"
import { isReceiptSigningEnabled } from "../lib/signing.js"
import { trackDiscoveryEvent } from "../lib/discovery.js"

const trustReceiptSchemaRef = {
  $ref: "https://ai-risk-oracle/schemas/trust-receipt.json"
} as const

const publicTrustReceiptSchemaRef = {
  $ref: "https://ai-risk-oracle/schemas/trust-receipt-public.json"
} as const

const verifyResultSchemaRef = {
  $ref: "https://ai-risk-oracle/schemas/verify-result.json"
} as const

const errorResponseSchema = {
  type: "object",
  additionalProperties: true,
  required: ["error"],
  properties: {
    error: { type: "string" }
  }
} as const

const verifyRequestSchema = {
  type: "object",
  additionalProperties: false,
  properties: {
    prompt: { type: "string" },
    response: { type: "string" },
    domain: { type: "string", default: "general" }
  },
  required: ["prompt", "response"]
} as const

const verifyBatchRequestSchema = {
  type: "object",
  additionalProperties: false,
  properties: {
    items: {
      type: "array",
      minItems: 1,
      maxItems: 100,
      items: verifyRequestSchema
    }
  },
  required: ["items"]
} as const

const batchVerifyResponseSchema = {
  type: "object",
  additionalProperties: false,
  required: ["ok", "batch_size", "billed", "results", "summary", "oracle"],
  properties: {
    ok: { type: "boolean", const: true },
    batch_size: { type: "integer", minimum: 1 },
    billed: {
      type: "object",
      additionalProperties: false,
      required: ["mode", "cost_usdc"],
      properties: {
        mode: {
          type: "string",
          enum: ["account", "payment_reference"]
        },
        cost_usdc: { type: "string" },
        cost_microusdc: { type: "integer", minimum: 0 },
        remaining_balance_usdc: { type: "string" },
        remaining_balance_microusdc: { type: "integer", minimum: 0 }
      }
    },
    results: {
      type: "array",
      items: verifyResultSchemaRef
    },
    summary: {
      type: "object",
      additionalProperties: false,
      required: ["count", "avg_consistency_score", "high_risk_count"],
      properties: {
        count: { type: "integer", minimum: 1 },
        avg_consistency_score: { type: "number", minimum: 0, maximum: 1 },
        high_risk_count: { type: "integer", minimum: 0 }
      }
    },
    oracle: {
      type: "object",
      additionalProperties: false,
      required: ["version", "signals_version", "trust_signing_enabled"],
      properties: {
        version: { type: "string" },
        signals_version: { type: "string" },
        trust_signing_enabled: { type: "boolean" }
      }
    }
  }
} as const

export async function openApiRoute(app: FastifyInstance) {
  async function openApiDocument(req: FastifyRequest) {
    const baseUrl =
      (req.headers["x-forwarded-proto"] ? String(req.headers["x-forwarded-proto"]) : "https") +
      "://" +
      String(req.headers.host)

    return {
      openapi: "3.0.3",
      info: {
        title: "InterAI Risk Oracle",
        version: "0.0.1",
        description:
          "AI response risk/consistency oracle with prepaid balance billing for autonomous agents.",
        "x-trust-signing-enabled": isReceiptSigningEnabled()
      },
      servers: [{ url: baseUrl }],
      components: {
        securitySchemes: {
          bearerAuth: {
            type: "http",
            scheme: "bearer"
          }
        },
        schemas: {
          ErrorResponse: errorResponseSchema,
          VerifyRequest: verifyRequestSchema,
          VerifyBatchRequest: verifyBatchRequestSchema,
          VerifyResult: verifyResultSchemaRef,
          TrustReceipt: trustReceiptSchemaRef,
          TrustReceiptPublic: publicTrustReceiptSchemaRef,
          VerifyBatchResponse: batchVerifyResponseSchema
        }
      },
      paths: {
        "/": {
          get: {
            responses: {
              "200": {
                description:
                  "Human-facing landing page with integration links and discovery entry points"
              }
            }
          }
        },
        "/service.json": {
          get: {
            responses: {
              "200": {
                description:
                  "Machine-readable service summary for clients that previously consumed the root JSON response"
              }
            }
          }
        },
        "/health": {
          get: {
            responses: {
              "200": {
                description: "Liveness and runtime mode information",
                content: {
                  "application/json": {
                    schema: {
                      type: "object",
                      additionalProperties: false,
                      required: [
                        "ok",
                        "service",
                        "version",
                        "payment_mode",
                        "trust_signing_enabled"
                      ],
                      properties: {
                        ok: { type: "boolean", const: true },
                        service: { type: "string" },
                        version: { type: "string" },
                        payment_mode: { type: "string" },
                        trust_signing_enabled: { type: "boolean" }
                      }
                    }
                  }
                }
              }
            }
          }
        },
        "/ready": {
          get: {
            responses: {
              "200": {
                description: "Readiness probe for Fly.io or other orchestrators",
                content: {
                  "application/json": {
                    schema: {
                      type: "object",
                      additionalProperties: false,
                      required: ["ok", "ready", "service", "version"],
                      properties: {
                        ok: { type: "boolean", const: true },
                        ready: { type: "boolean", const: true },
                        service: { type: "string" },
                        version: { type: "string" }
                      }
                    }
                  }
                }
              }
            }
          }
        },
        "/.well-known/agent.json": {
          get: {
            responses: {
              "200": {
                description: "A2A Agent Card for agent discovery"
              }
            }
          }
        },
        "/.well-known/ai-risk-oracle": {
          get: {
            responses: {
              "200": {
                description: "Alias for the AI Risk Oracle service descriptor"
              }
            }
          }
        },
        "/.well-known/discovery-bundle.json": {
          get: {
            responses: {
              "200": {
                description:
                  "Single discovery bundle for agents that want service descriptor, agent card, runtime mode, schemas, and sample payloads in one fetch"
              }
            }
          }
        },
        "/openapi.json": {
          get: {
            responses: {
              "200": {
                description: "Alias for the OpenAPI contract"
              }
            }
          }
        },
        "/discovery.json": {
          get: {
            responses: {
              "200": {
                description: "Alias for the single-fetch discovery bundle"
              }
            }
          }
        },
        "/pricing": {
          get: {
            responses: {
              "200": {
                description:
                  "Public pricing, trial, top-up and idempotency metadata for self-serve integration"
              }
            }
          }
        },
        "/mcp": {
          post: {
            requestBody: {
              required: true,
              content: {
                "application/json": {
                  schema: {
                    type: "object",
                    additionalProperties: true,
                    required: ["jsonrpc", "method"],
                    properties: {
                      jsonrpc: { type: "string", enum: ["2.0"] },
                      id: {
                        oneOf: [
                          { type: "string" },
                          { type: "number" },
                          { type: "null" }
                        ]
                      },
                      method: {
                        type: "string",
                        enum: [
                          "initialize",
                          "notifications/initialized",
                          "tools/list",
                          "tools/call",
                          "resources/list",
                          "resources/read",
                          "prompts/list",
                          "prompts/get"
                        ]
                      },
                      params: {
                        type: "object",
                        additionalProperties: true
                      }
                    }
                  }
                }
              }
            },
            responses: {
              "200": {
                description:
                  "MCP JSON-RPC response supporting initialize, tools, resources, and prompts"
              },
              "202": {
                description:
                  "MCP notifications/initialized accepted without response body requirements"
              },
              "400": {
                description: "Invalid JSON-RPC envelope"
              }
            }
          }
        },
        "/onboard": {
          post: {
            requestBody: {
              required: false,
              content: {
                "application/json": {
                  schema: {
                    type: "object",
                    properties: {
                      account_id: { type: "string" },
                      name: { type: "string" },
                      api_key_name: { type: "string" },
                      recommended_topup_usdc: { type: "string" }
                    }
                  }
                }
              }
            },
            responses: {
              "200": { description: "Account and API key created" },
              "404": {
                description: "Onboarding disabled",
                content: {
                  "application/json": {
                    schema: errorResponseSchema
                  }
                }
              }
            }
          }
        },
        "/me": {
          get: {
            security: [{ bearerAuth: [] }],
            responses: {
              "200": { description: "Authenticated account profile and balance" },
              "401": {
                description: "Missing or invalid API key",
                content: {
                  "application/json": {
                    schema: errorResponseSchema
                  }
                }
              }
            }
          }
        },
        "/ledger": {
          get: {
            security: [{ bearerAuth: [] }],
            parameters: [
              {
                name: "limit",
                in: "query",
                required: false,
                schema: { type: "integer", minimum: 1, maximum: 100 }
              }
            ],
            responses: {
              "200": { description: "Ledger entries for authenticated account" },
              "401": {
                description: "Missing or invalid API key",
                content: {
                  "application/json": {
                    schema: errorResponseSchema
                  }
                }
              }
            }
          }
        },
        "/usage": {
          get: {
            security: [{ bearerAuth: [] }],
            parameters: [
              {
                name: "limit",
                in: "query",
                required: false,
                schema: { type: "integer", minimum: 1, maximum: 100 }
              }
            ],
            responses: {
              "200": { description: "Usage events for authenticated account" },
              "401": {
                description: "Missing or invalid API key",
                content: {
                  "application/json": {
                    schema: errorResponseSchema
                  }
                }
              }
            }
          }
        },
        "/trust/receipts": {
          get: {
            security: [{ bearerAuth: [] }],
            parameters: [
              {
                name: "limit",
                in: "query",
                required: false,
                schema: { type: "integer", minimum: 1, maximum: 200 }
              }
            ],
            responses: {
              "200": { description: "Trust receipts for authenticated account" },
              "401": {
                description: "Missing or invalid API key",
                content: {
                  "application/json": {
                    schema: errorResponseSchema
                  }
                }
              }
            }
          }
        },
        "/trust/receipts/{receiptId}": {
          get: {
            parameters: [
              {
                name: "receiptId",
                in: "path",
                required: true,
                schema: { type: "string" }
              }
            ],
            responses: {
              "200": {
                description: "Canonical public trust receipt representation",
                content: {
                  "application/json": {
                    schema: publicTrustReceiptSchemaRef
                  }
                }
              },
              "400": {
                description: "Missing receipt identifier",
                content: {
                  "application/json": {
                    schema: errorResponseSchema
                  }
                }
              },
              "404": {
                description: "Trust receipt not found",
                content: {
                  "application/json": {
                    schema: errorResponseSchema
                  }
                }
              }
            }
          }
        },
        "/trust/reputation": {
          get: {
            security: [{ bearerAuth: [] }],
            parameters: [
              {
                name: "domains_limit",
                in: "query",
                required: false,
                schema: { type: "integer", minimum: 1, maximum: 100 }
              }
            ],
            responses: {
              "200": {
                description:
                  "Historical trust reputation summary for the authenticated account, including per-domain aggregates"
              },
              "401": {
                description: "Missing or invalid API key",
                content: {
                  "application/json": {
                    schema: errorResponseSchema
                  }
                }
              }
            }
          }
        },
        "/trust/verify-signature": {
          post: {
            requestBody: {
              required: true,
              content: {
                "application/json": {
                  schema: {
                    type: "object",
                    additionalProperties: false,
                    properties: {
                      receipt: { type: "object" },
                      signature: { type: "string" },
                      signature_alg: { type: "string", enum: ["hmac-sha256"] }
                    },
                    required: ["receipt", "signature"]
                  }
                }
              }
            },
            responses: {
              "200": {
                description: "Signature verification result",
                content: {
                  "application/json": {
                    schema: {
                      type: "object",
                      additionalProperties: false,
                      required: ["valid", "signature_alg"],
                      properties: {
                        valid: { type: "boolean" },
                        signature_alg: { type: "string", enum: ["hmac-sha256"] }
                      }
                    }
                  }
                }
              },
              "400": {
                description: "Malformed verification payload",
                content: {
                  "application/json": {
                    schema: errorResponseSchema
                  }
                }
              },
              "503": {
                description: "Receipt signing not configured on this server",
                content: {
                  "application/json": {
                    schema: errorResponseSchema
                  }
                }
              }
            }
          }
        },
        "/schemas/trust-receipt.json": {
          get: {
            responses: {
              "200": { description: "JSON Schema for canonical trust receipts" }
            }
          }
        },
        "/schemas/trust-receipt-public.json": {
          get: {
            responses: {
              "200": {
                description: "JSON Schema for public trust receipt lookup responses"
              }
            }
          }
        },
        "/schemas/verify-result.json": {
          get: {
            responses: {
              "200": { description: "JSON Schema for verify responses" }
            }
          }
        },
        "/topup/create": {
          post: {
            security: [{ bearerAuth: [] }],
            requestBody: {
              required: false,
              content: {
                "application/json": {
                  schema: {
                    type: "object",
                    properties: {
                      account_id: { type: "string" },
                      amount_usdc: { type: "string" }
                    }
                  }
                }
              }
            },
            responses: {
              "200": { description: "Top-up intent created" },
              "400": {
                description: "Missing account context",
                content: {
                  "application/json": {
                    schema: errorResponseSchema
                  }
                }
              },
              "401": {
                description: "Invalid API key",
                content: {
                  "application/json": {
                    schema: errorResponseSchema
                  }
                }
              }
            }
          }
        },
        "/topup/confirm": {
          post: {
            parameters: [
              {
                name: "X-Topup-Id",
                in: "header",
                required: true,
                schema: { type: "string" }
              },
              {
                name: "X-Tx-Hash",
                in: "header",
                required: true,
                schema: { type: "string" }
              }
            ],
            responses: {
              "200": { description: "Top-up confirmed and credited" },
              "400": {
                description: "Invalid or expired top-up",
                content: {
                  "application/json": {
                    schema: errorResponseSchema
                  }
                }
              },
              "402": {
                description: "Transaction verification failed",
                content: {
                  "application/json": {
                    schema: errorResponseSchema
                  }
                }
              }
            }
          }
        },
        "/topup/{topupId}": {
          get: {
            parameters: [
              {
                name: "topupId",
                in: "path",
                required: true,
                schema: { type: "string" }
              }
            ],
            responses: {
              "200": { description: "Top-up status" },
              "404": {
                description: "Top-up not found",
                content: {
                  "application/json": {
                    schema: errorResponseSchema
                  }
                }
              }
            }
          }
        },
        "/verify": {
          post: {
            security: [{ bearerAuth: [] }],
            parameters: [
              {
                name: "X-Idempotency-Key",
                in: "header",
                required: false,
                schema: { type: "string" }
              },
              {
                name: "PAYMENT-SIGNATURE",
                in: "header",
                required: false,
                schema: { type: "string" },
                description:
                  "x402 v2 payment payload. Use either PAYMENT-SIGNATURE or bearer auth, not both."
              }
            ],
            requestBody: {
              required: true,
              content: {
                "application/json": {
                  schema: verifyRequestSchema
                }
              }
            },
            responses: {
              "200": {
                description: "Verification result with trust signals and receipt",
                content: {
                  "application/json": {
                    schema: verifyResultSchemaRef
                  }
                }
              },
              "400": {
                description: "Ambiguous payment mode or malformed request",
                content: {
                  "application/json": {
                    schema: errorResponseSchema
                  }
                }
              },
              "401": {
                description: "Invalid API key",
                content: {
                  "application/json": {
                    schema: errorResponseSchema
                  }
                }
              },
              "402": {
                description:
                  "Insufficient prepaid balance, x402 payment required, or x402 settlement failure",
                content: {
                  "application/json": {
                    schema: {
                      type: "object",
                      additionalProperties: true
                    }
                  }
                }
              },
              "500": {
                description: "Onchain verification backend failure",
                content: {
                  "application/json": {
                    schema: errorResponseSchema
                  }
                }
              }
            }
          }
        },
        "/verify/batch": {
          post: {
            security: [{ bearerAuth: [] }],
            parameters: [
              {
                name: "X-Idempotency-Key",
                in: "header",
                required: false,
                schema: { type: "string" }
              },
              {
                name: "PAYMENT-SIGNATURE",
                in: "header",
                required: false,
                schema: { type: "string" },
                description:
                  "x402 v2 payment payload. Use either PAYMENT-SIGNATURE or bearer auth, not both."
              }
            ],
            requestBody: {
              required: true,
              content: {
                "application/json": {
                  schema: verifyBatchRequestSchema
                }
              }
            },
            responses: {
              "200": {
                description: "Batch verification result",
                content: {
                  "application/json": {
                    schema: batchVerifyResponseSchema
                  }
                }
              },
              "400": {
                description: "Malformed batch payload or batch size out of range",
                content: {
                  "application/json": {
                    schema: errorResponseSchema
                  }
                }
              },
              "401": {
                description: "Invalid API key",
                content: {
                  "application/json": {
                    schema: errorResponseSchema
                  }
                }
              },
              "402": {
                description: "Insufficient balance or payment required",
                content: {
                  "application/json": {
                    schema: errorResponseSchema
                  }
                }
              },
              "500": {
                description: "Onchain verification backend failure",
                content: {
                  "application/json": {
                    schema: errorResponseSchema
                  }
                }
              }
            }
          }
        },
        "/a2a": {
          post: {
            security: [{ bearerAuth: [] }],
            requestBody: {
              required: true,
              content: {
                "application/json": {
                  schema: {
                    type: "object",
                    additionalProperties: true,
                    required: ["jsonrpc", "id", "method", "params"],
                    properties: {
                      jsonrpc: { type: "string", enum: ["2.0"] },
                      id: {
                        oneOf: [
                          { type: "string" },
                          { type: "number" },
                          { type: "null" }
                        ]
                      },
                      method: { type: "string", enum: ["message/send"] },
                      params: {
                        type: "object",
                        additionalProperties: true,
                        properties: {
                          message: {
                            type: "object",
                            additionalProperties: true,
                            required: ["role", "parts", "messageId"],
                            properties: {
                              role: { type: "string", enum: ["user"] },
                              messageId: { type: "string" },
                              contextId: { type: "string" },
                              parts: {
                                type: "array",
                                minItems: 1,
                                items: {
                                  oneOf: [
                                    {
                                      type: "object",
                                      additionalProperties: true,
                                      required: ["kind", "text"],
                                      properties: {
                                        kind: { type: "string", enum: ["text"] },
                                        text: { type: "string" }
                                      }
                                    },
                                    {
                                      type: "object",
                                      additionalProperties: true,
                                      required: ["kind", "data"],
                                      properties: {
                                        kind: { type: "string", enum: ["data"] },
                                        data: {
                                          type: "object",
                                          additionalProperties: true,
                                          description:
                                            "Either { prompt, response, domain? } or { items: [...] }"
                                        }
                                      }
                                    }
                                  ]
                                }
                              }
                            }
                          },
                          metadata: {
                            type: "object",
                            additionalProperties: true,
                            properties: {
                              idempotency_key: { type: "string" }
                            }
                          }
                        }
                      }
                    }
                  }
                }
              }
            },
            responses: {
              "200": {
                description:
                  "JSON-RPC success or error response for A2A synchronous verification"
              },
              "400": {
                description: "Invalid JSON-RPC envelope"
              }
            }
          }
        }
      }
    }
  }

  app.get("/.well-known/openapi.json", async (req) => {
    trackDiscoveryEvent(req, "openapi_view", "/.well-known/openapi.json")
    return openApiDocument(req)
  })

  app.get("/openapi.json", async (req) => {
    trackDiscoveryEvent(req, "openapi_alias_view", "/openapi.json")
    return openApiDocument(req)
  })
}
