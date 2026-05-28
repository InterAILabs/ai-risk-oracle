import { randomUUID } from "crypto"
import { FastifyPluginAsync, FastifyRequest } from "fastify"
import {
  getBatchAmount,
  getVerifyAmount,
  normalizeVerificationMode,
  PRICING
} from "../config/pricing.js"
import { extractBearerToken } from "../lib/auth.js"
import { trackDiscoveryEvent, trackServiceEvent } from "../lib/discovery.js"
import { economicError } from "../lib/httpErrors.js"
import { buildPublicPricing } from "../lib/publicMeta.js"
import {
  isReceiptSigningEnabled,
  RECEIPT_SIGNATURE_ALG,
  verifyReceiptSignature
} from "../lib/signing.js"
import {
  getAccount,
  getDiscoveryStats,
  getTrustReceiptById,
  resolveAccountByApiKey
} from "../payments/fileStore.js"
import {
  buildInsufficientBalanceDetails,
  chargeAndRecordUsage,
  ENGINE_VERSION,
  ORACLE_SIGNALS_VERSION,
  runBatchVerification,
  runVerification,
  TRUST_SIGNING_ENABLED,
  usdcAmountToMicrousdc
} from "../services/verificationFlow.js"

type JsonRpcId = string | number | null

type McpRequest = {
  jsonrpc?: string
  id?: JsonRpcId
  method?: string
  params?: Record<string, unknown>
}

type McpResource = {
  uri: string
  name: string
  title?: string
  description: string
  mimeType: string
}

const SUPPORTED_PROTOCOL_VERSIONS = [
  "2025-11-25",
  "2025-06-18",
  "2025-03-26"
] as const

const TOOL_DEFS = [
  {
    name: "oracle.verify_response",
    description:
      "Bill one prepaid verification against the authenticated account and return risk, trust, and a signed trust receipt.",
    inputSchema: {
      type: "object",
      additionalProperties: false,
      properties: {
        prompt: { type: "string" },
        response: { type: "string" },
        domain: { type: "string" },
        mode: {
          type: "string",
          enum: ["fast_heuristic", "semantic_judge"]
        },
        idempotency_key: { type: "string" }
      },
      required: ["prompt", "response"]
    }
  },
  {
    name: "oracle.verify_batch",
    description:
      "Bill one prepaid batch verification against the authenticated account and return trust receipts for up to 100 items.",
    inputSchema: {
      type: "object",
      additionalProperties: false,
      properties: {
        items: {
          type: "array",
          minItems: 1,
          maxItems: 100,
          items: {
            type: "object",
            additionalProperties: false,
            properties: {
              prompt: { type: "string" },
              response: { type: "string" },
              domain: { type: "string" }
            },
            required: ["prompt", "response"]
          }
        },
        idempotency_key: { type: "string" }
      },
      required: ["items"]
    }
  },
  {
    name: "oracle.get_pricing",
    description:
      "Return public pricing, trial, idempotency and top-up metadata for self-serve integration.",
    inputSchema: {
      type: "object",
      additionalProperties: false,
      properties: {}
    }
  },
  {
    name: "oracle.discovery_bundle",
    description:
      "Return the single-fetch discovery bundle with interfaces, runtime mode, schemas, and sample payloads.",
    inputSchema: {
      type: "object",
      additionalProperties: false,
      properties: {}
    }
  },
  {
    name: "oracle.service_descriptor",
    description:
      "Return the agent-oriented AI service descriptor with billing, trust, A2A and endpoint metadata.",
    inputSchema: {
      type: "object",
      additionalProperties: false,
      properties: {}
    }
  },
  {
    name: "oracle.agent_card",
    description:
      "Return the A2A Agent Card published at the well-known location.",
    inputSchema: {
      type: "object",
      additionalProperties: false,
      properties: {}
    }
  },
  {
    name: "oracle.get_trust_receipt",
    description:
      "Resolve the canonical public trust receipt representation by receipt ID.",
    inputSchema: {
      type: "object",
      additionalProperties: false,
      properties: {
        receipt_id: { type: "string" }
      },
      required: ["receipt_id"]
    }
  },
  {
    name: "oracle.verify_trust_receipt_signature",
    description:
      "Verify a signed trust receipt payload when signing is enabled on the server.",
    inputSchema: {
      type: "object",
      additionalProperties: false,
      properties: {
        receipt: { type: "object" },
        signature: { type: "string" },
        signature_alg: { type: "string", enum: ["hmac-sha256"] }
      },
      required: ["receipt", "signature"]
    }
  },
  {
    name: "oracle.get_adoption_stats",
    description:
      "Return discovery and adoption funnel telemetry. Requires admin bearer token via x-admin-token header, not the standard API key.",
    inputSchema: {
      type: "object",
      additionalProperties: false,
      properties: {}
    }
  }
] as const

function jsonRpcResult(id: JsonRpcId, result: unknown) {
  return {
    jsonrpc: "2.0",
    id,
    result
  }
}

function jsonRpcError(
  id: JsonRpcId,
  code: number,
  message: string,
  data?: Record<string, unknown>
) {
  return {
    jsonrpc: "2.0",
    id,
    error: {
      code,
      message,
      ...(data ? { data } : {})
    }
  }
}

function contentJson(payload: unknown) {
  return [
    {
      type: "text",
      text: JSON.stringify(payload, null, 2)
    }
  ]
}

function buildBaseUrl(req: FastifyRequest) {
  const proto = req.headers["x-forwarded-proto"]
    ? String(req.headers["x-forwarded-proto"])
    : "https"
  return `${proto}://${String(req.headers.host)}`
}

function buildServiceDescriptor(baseUrl: string) {
  return {
    name: "InterAI Risk Oracle",
    id: "interai-risk-oracle",
    version: "0.0.1",
    description:
      "AI response risk and consistency oracle with prepaid per-request billing, designed for autonomous agents.",
    discovery: {
      service_descriptor: `${baseUrl}/.well-known/ai-service.json`,
      openapi: `${baseUrl}/.well-known/openapi.json`,
      a2a_agent_card: `${baseUrl}/.well-known/agent.json`,
      discovery_bundle: `${baseUrl}/.well-known/discovery-bundle.json`,
      pricing: `${baseUrl}/pricing`
    },
    endpoints: {
      health: `${baseUrl}/health`,
      ready: `${baseUrl}/ready`,
      a2a: `${baseUrl}/a2a`,
      a2a_agent_card: `${baseUrl}/.well-known/agent.json`,
      discovery_bundle: `${baseUrl}/.well-known/discovery-bundle.json`,
      pricing: `${baseUrl}/pricing`,
      onboard: `${baseUrl}/onboard`,
      me: `${baseUrl}/me`,
      ledger: `${baseUrl}/ledger`,
      usage: `${baseUrl}/usage`,
      verify: `${baseUrl}/verify`,
      verify_batch: `${baseUrl}/verify/batch`,
      trust_receipts: `${baseUrl}/trust/receipts`,
      trust_reputation: `${baseUrl}/trust/reputation`,
      trust_receipt_get: `${baseUrl}/trust/receipts/{receiptId}`,
      trust_verify_signature: `${baseUrl}/trust/verify-signature`,
      trust_receipt_schema: `${baseUrl}/schemas/trust-receipt.json`,
      trust_receipt_public_schema: `${baseUrl}/schemas/trust-receipt-public.json`,
      verify_result_schema: `${baseUrl}/schemas/verify-result.json`,
      mcp: `${baseUrl}/mcp`,
      topup_create: `${baseUrl}/topup/create`,
      topup_confirm: `${baseUrl}/topup/confirm`,
      topup_status: `${baseUrl}/topup/{topupId}`
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
      pricing_url: `${baseUrl}/pricing`,
      idempotency: {
        supported: true,
        header: "X-Idempotency-Key",
        applies_to: ["/verify", "/verify/batch", "/a2a", "/mcp"]
      },
      trust: {
        signing_enabled: isReceiptSigningEnabled(),
        signature_algorithm: "hmac-sha256"
      },
      trial: buildPublicPricing(baseUrl).trial
    },
    agent_protocols: {
      a2a: {
        supported: true,
        rpc_endpoint: `${baseUrl}/a2a`,
        agent_card: `${baseUrl}/.well-known/agent.json`
      },
      mcp: {
        supported: true,
        rpc_endpoint: `${baseUrl}/mcp`,
        supported_methods: [
          "initialize",
          "tools/list",
          "tools/call",
          "resources/list",
          "resources/read",
          "prompts/list",
          "prompts/get"
        ]
      }
    }
  }
}

function buildAgentCard(baseUrl: string) {
  return {
    name: "InterAI Risk Oracle",
    description:
      "Autonomous-agent verification service for response consistency, hallucination risk, and signed trust receipts with prepaid account billing.",
    url: `${baseUrl}/a2a`,
    provider: {
      organization: "InterAI",
      url: baseUrl
    },
    version: "0.0.1",
    documentationUrl: `${baseUrl}/.well-known/openapi.json`,
    capabilities: {
      streaming: false,
      pushNotifications: false,
      stateTransitionHistory: false
    },
    securitySchemes: {
      bearerAuth: {
        type: "apiKey",
        in: "header",
        name: "Authorization",
        description:
          "Use Authorization: Bearer <api_key>. Obtain credentials from POST /onboard and fund the account before calling the A2A endpoint."
      }
    },
    security: [{ bearerAuth: [] }],
    defaultInputModes: ["application/json", "text/plain"],
    defaultOutputModes: ["application/json"],
    skills: [
      {
        id: "verify_response",
        name: "Verify Response",
        description:
          "Evaluate a prompt/response pair, score consistency and hallucination risk, and return a signed trust receipt when signing is configured."
      },
      {
        id: "verify_batch",
        name: "Verify Batch",
        description:
          "Evaluate up to 100 prompt/response items in one billed request and return trust receipts for each item."
      }
    ]
  }
}

function buildDiscoveryBundle(baseUrl: string) {
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
      }
    }
  }
}

function buildResourceCatalog(baseUrl: string): McpResource[] {
  return [
    {
      uri: "oracle://service/pricing",
      name: "pricing",
      title: "Public Pricing",
      description:
        "Public pricing, trial, and top-up metadata to help agents estimate cost and onboarding friction.",
      mimeType: "application/json"
    },
    {
      uri: "oracle://service/descriptor",
      name: "service-descriptor",
      title: "AI Service Descriptor",
      description:
        "Machine-readable descriptor for billing, trust, endpoints, and agent integration flow.",
      mimeType: "application/json"
    },
    {
      uri: "oracle://service/agent-card",
      name: "agent-card",
      title: "A2A Agent Card",
      description:
        "A2A discovery card for synchronous agent-to-agent verification calls.",
      mimeType: "application/json"
    },
    {
      uri: "oracle://service/discovery-bundle",
      name: "discovery-bundle",
      title: "Discovery Bundle",
      description:
        "Single-fetch bundle with runtime mode, schemas, interfaces, and sample payloads.",
      mimeType: "application/json"
    },
    {
      uri: "oracle://schema/verify-result",
      name: "verify-result-schema",
      title: "Verify Result Schema",
      description:
        "Canonical schema for the single-item verification response returned by POST /verify.",
      mimeType: "application/json"
    },
    {
      uri: "oracle://schema/trust-receipt",
      name: "trust-receipt-schema",
      title: "Trust Receipt Schema",
      description: "Canonical schema for the signed trust receipt payload.",
      mimeType: "application/json"
    },
    {
      uri: "oracle://schema/trust-receipt-public",
      name: "trust-receipt-public-schema",
      title: "Public Trust Receipt Lookup Schema",
      description:
        "Schema for the public trust receipt lookup response by receipt ID.",
      mimeType: "application/json"
    },
    {
      uri: "oracle://meta/runtime",
      name: "runtime-meta",
      title: "Runtime Metadata",
      description:
        "Current runtime mode, trust-signing availability, and core probes.",
      mimeType: "application/json"
    }
  ].map((resource) => ({
    ...resource,
    description: `${resource.description} Public HTTP mirror rooted at ${baseUrl}.`
  }))
}

function readResource(uri: string, baseUrl: string) {
  if (uri === "oracle://service/pricing") {
    return buildPublicPricing(baseUrl)
  }

  if (uri === "oracle://service/descriptor") {
    return buildServiceDescriptor(baseUrl)
  }

  if (uri === "oracle://service/agent-card") {
    return buildAgentCard(baseUrl)
  }

  if (uri === "oracle://service/discovery-bundle") {
    return buildDiscoveryBundle(baseUrl)
  }

  if (uri === "oracle://schema/verify-result") {
    return {
      schema_url: `${baseUrl}/schemas/verify-result.json`,
      title: "AI Risk Oracle Verify Result",
      description:
        "Schema for the enriched single-item verification response returned by POST /verify."
    }
  }

  if (uri === "oracle://schema/trust-receipt") {
    return {
      schema_url: `${baseUrl}/schemas/trust-receipt.json`,
      title: "AI Risk Oracle Trust Receipt",
      description: "Canonical schema for the trust receipt payload."
    }
  }

  if (uri === "oracle://schema/trust-receipt-public") {
    return {
      schema_url: `${baseUrl}/schemas/trust-receipt-public.json`,
      title: "AI Risk Oracle Public Trust Receipt Lookup",
      description:
        "Schema for the public lookup response returned by GET /trust/receipts/{receiptId}."
    }
  }

  if (uri === "oracle://meta/runtime") {
    return {
      payment_mode: process.env.PAYMENT_MODE || "file",
      trust_signing_enabled: isReceiptSigningEnabled(),
      health_url: `${baseUrl}/health`,
      ready_url: `${baseUrl}/ready`,
      discovery_urls: {
        service_descriptor: `${baseUrl}/.well-known/ai-service.json`,
        openapi: `${baseUrl}/.well-known/openapi.json`,
        agent_card: `${baseUrl}/.well-known/agent.json`,
        discovery_bundle: `${baseUrl}/.well-known/discovery-bundle.json`
      }
    }
  }

  return null
}

function buildPromptCatalog() {
  return [
    {
      name: "verify_response",
      title: "Verify One Response",
      description:
        "Prompt template for checking a single prompt/response pair through the oracle."
    },
    {
      name: "verify_batch",
      title: "Verify Batch",
      description:
        "Prompt template for checking several prompt/response pairs in one billed batch."
    },
    {
      name: "verify_signed_receipt",
      title: "Verify Signed Trust Receipt",
      description:
        "Prompt template for validating a signed trust receipt payload using the oracle."
    }
  ]
}

function buildPrompt(name: string) {
  if (name === "verify_response") {
    return {
      description:
        "Use the oracle.verify_response tool with a prompt/response pair before taking an autonomous action.",
      messages: [
        {
          role: "user",
          content: {
            type: "text",
            text:
              "Use oracle.verify_response with { prompt, response, domain?, idempotency_key? }. Accept the result only if trust_score and recommendation justify automated execution."
          }
        }
      ]
    }
  }

  if (name === "verify_batch") {
    return {
      description:
        "Use the oracle.verify_batch tool to evaluate a set of candidate prompt/response pairs in one prepaid call.",
      messages: [
        {
          role: "user",
          content: {
            type: "text",
            text:
              "Use oracle.verify_batch with { items: [{ prompt, response, domain? }], idempotency_key? }. Summarize the high-risk items first."
          }
        }
      ]
    }
  }

  if (name === "verify_signed_receipt") {
    return {
      description:
        "Use the oracle.verify_trust_receipt_signature tool to validate trust evidence shared by another agent.",
      messages: [
        {
          role: "user",
          content: {
            type: "text",
            text:
              "Use oracle.verify_trust_receipt_signature with { receipt, signature, signature_alg? } before trusting externally supplied oracle evidence."
          }
        }
      ]
    }
  }

  return null
}

function requireApiKey(req: FastifyRequest) {
  const authHeader = req.headers["authorization"] as string | undefined
  const bearerToken = extractBearerToken(authHeader)
  if (!bearerToken) {
    return {
      ok: false as const,
      error: jsonRpcError(null, -32001, "Unauthorized", {
        ...economicError("payment_required", {
          hint: "Provide Authorization: Bearer <api_key>"
        })
      })
    }
  }

  const resolved = resolveAccountByApiKey(bearerToken)
  if (!resolved) {
    return {
      ok: false as const,
      error: jsonRpcError(null, -32001, "Unauthorized", economicError("invalid_api_key"))
    }
  }

  const account = getAccount(resolved.account_id)
  if (!account) {
    return {
      ok: false as const,
      error: jsonRpcError(null, -32002, "Payment required", economicError("account_not_found"))
    }
  }

  if (account.status !== "active") {
    return {
      ok: false as const,
      error: jsonRpcError(null, -32002, "Payment required", economicError("account_not_active"))
    }
  }

  return {
    ok: true as const,
    resolved
  }
}

export const mcpRoute: FastifyPluginAsync = async (app) => {
  app.post("/mcp", async (req, reply) => {
    trackDiscoveryEvent(req, "mcp_call", "/mcp")
    const body = (req.body || {}) as McpRequest
    const requestId = body.id ?? null

    if (body.jsonrpc !== "2.0" || !body.method) {
      return reply
        .code(400)
        .send(
          jsonRpcError(requestId, -32600, "Invalid Request", {
            error: "invalid_jsonrpc_request"
          })
        )
    }

    const baseUrl = buildBaseUrl(req)

    if (body.method === "initialize") {
      const protocolVersion =
        typeof body.params?.protocolVersion === "string"
          ? body.params.protocolVersion
          : SUPPORTED_PROTOCOL_VERSIONS[0]
      const negotiatedVersion =
        SUPPORTED_PROTOCOL_VERSIONS.find((item) => item === protocolVersion) ??
        SUPPORTED_PROTOCOL_VERSIONS[0]

      return reply.send(
        jsonRpcResult(requestId, {
          protocolVersion: negotiatedVersion,
          capabilities: {
            tools: {
              listChanged: false
            },
            resources: {
              listChanged: false,
              subscribe: false
            },
            prompts: {
              listChanged: false
            }
          },
          serverInfo: {
            name: "interai-risk-oracle",
            title: "InterAI Risk Oracle MCP Bridge",
            version: "0.0.1"
          }
        })
      )
    }

    if (body.method === "notifications/initialized") {
      return reply.code(202).send()
    }

    if (body.method === "tools/list") {
      trackDiscoveryEvent(req, "mcp_tools_list", "/mcp")
      return reply.send(
        jsonRpcResult(requestId, {
          tools: TOOL_DEFS
        })
      )
    }

    if (body.method === "resources/list") {
      trackDiscoveryEvent(req, "mcp_resources_list", "/mcp")
      return reply.send(
        jsonRpcResult(requestId, {
          resources: buildResourceCatalog(baseUrl)
        })
      )
    }

    if (body.method === "resources/read") {
      const uri = typeof body.params?.uri === "string" ? body.params.uri : ""
      if (!uri) {
        return reply.send(
          jsonRpcError(requestId, -32602, "Invalid params", {
            error: "missing_resource_uri"
          })
        )
      }

      const payload = readResource(uri, baseUrl)
      if (!payload) {
        return reply.send(
          jsonRpcError(requestId, -32004, "Not found", {
            error: "resource_not_found",
            uri
          })
        )
      }

      trackDiscoveryEvent(req, "mcp_resource_read", "/mcp")
      return reply.send(
        jsonRpcResult(requestId, {
          contents: [
            {
              uri,
              mimeType: "application/json",
              text: JSON.stringify(payload, null, 2)
            }
          ]
        })
      )
    }

    if (body.method === "prompts/list") {
      trackDiscoveryEvent(req, "mcp_prompts_list", "/mcp")
      return reply.send(
        jsonRpcResult(requestId, {
          prompts: buildPromptCatalog()
        })
      )
    }

    if (body.method === "prompts/get") {
      const name = typeof body.params?.name === "string" ? body.params.name : ""
      if (!name) {
        return reply.send(
          jsonRpcError(requestId, -32602, "Invalid params", {
            error: "missing_prompt_name"
          })
        )
      }

      const prompt = buildPrompt(name)
      if (!prompt) {
        return reply.send(
          jsonRpcError(requestId, -32004, "Not found", {
            error: "prompt_not_found",
            name
          })
        )
      }

      trackDiscoveryEvent(req, "mcp_prompt_get", "/mcp")
      return reply.send(
        jsonRpcResult(requestId, {
          name,
          ...prompt
        })
      )
    }

    if (body.method !== "tools/call") {
      return reply.send(
        jsonRpcError(requestId, -32601, "Method not found", {
          error: "unsupported_mcp_method"
        })
      )
    }

    const toolName =
      typeof body.params?.name === "string" ? body.params.name : ""
    const args =
      body.params?.arguments && typeof body.params.arguments === "object"
        ? (body.params.arguments as Record<string, unknown>)
        : {}

    if (toolName === "oracle.discovery_bundle") {
      trackDiscoveryEvent(req, "mcp_tool_discovery_bundle", "/mcp")
      return reply.send(
        jsonRpcResult(requestId, {
          content: contentJson(buildDiscoveryBundle(baseUrl))
        })
      )
    }

    if (toolName === "oracle.get_pricing") {
      trackDiscoveryEvent(req, "mcp_tool_get_pricing", "/mcp")
      return reply.send(
        jsonRpcResult(requestId, {
          content: contentJson(buildPublicPricing(baseUrl))
        })
      )
    }

    if (toolName === "oracle.service_descriptor") {
      trackDiscoveryEvent(req, "mcp_tool_service_descriptor", "/mcp")
      return reply.send(
        jsonRpcResult(requestId, {
          content: contentJson(buildServiceDescriptor(baseUrl))
        })
      )
    }

    if (toolName === "oracle.agent_card") {
      trackDiscoveryEvent(req, "mcp_tool_agent_card", "/mcp")
      return reply.send(
        jsonRpcResult(requestId, {
          content: contentJson(buildAgentCard(baseUrl))
        })
      )
    }

    if (toolName === "oracle.get_trust_receipt") {
      const receiptId = String(args.receipt_id ?? "")
      if (!receiptId) {
        return reply.send(
          jsonRpcError(requestId, -32602, "Invalid params", {
            error: "missing_receipt_id"
          })
        )
      }

      const record = getTrustReceiptById(receiptId)
      if (!record) {
        return reply.send(
          jsonRpcError(requestId, -32004, "Not found", economicError("trust_receipt_not_found"))
        )
      }

      return reply.send(
        jsonRpcResult(requestId, {
          content: contentJson({
            ok: true,
            receipt: {
              receipt_id: record.receipt_id,
              issued_at: record.issued_at,
              oracle_version: record.oracle_version,
              signals_version: record.signals_version,
              request_hash: record.request_hash,
              decision_basis: {
                dominant_negatives: record.dominant_negatives,
                dominant_positives: record.dominant_positives
              }
            },
            verification: {
              signed: record.signature !== "",
              signature: record.signature || null,
              signature_alg: record.signature ? record.signature_alg : null
            },
            trust: {
              domain: record.domain,
              trust_score: record.trust_score,
              risk_level: record.risk_level,
              confidence_band: record.confidence_band
            }
          })
        })
      )
    }

    if (toolName === "oracle.verify_trust_receipt_signature") {
      const receipt = args.receipt
      const signature = args.signature
      const signatureAlg = args.signature_alg

      if (!receipt || typeof receipt !== "object") {
        return reply.send(
          jsonRpcError(requestId, -32602, "Invalid params", {
            error: "missing_receipt"
          })
        )
      }

      if (!signature || typeof signature !== "string") {
        return reply.send(
          jsonRpcError(requestId, -32602, "Invalid params", {
            error: "missing_signature"
          })
        )
      }

      if (signatureAlg && signatureAlg !== RECEIPT_SIGNATURE_ALG) {
        return reply.send(
          jsonRpcError(requestId, -32602, "Invalid params", {
            error: "unsupported_signature_alg"
          })
        )
      }

      if (!isReceiptSigningEnabled()) {
        return reply.send(
          jsonRpcError(requestId, -32003, "Unavailable", {
            error: "receipt_signing_not_configured"
          })
        )
      }

      const valid = verifyReceiptSignature({
        payload: receipt as Record<string, unknown>,
        signature
      })
      trackServiceEvent(req, "trust_signature_check", "/mcp")

      return reply.send(
        jsonRpcResult(requestId, {
          content: contentJson({
            valid,
            signature_alg: RECEIPT_SIGNATURE_ALG
          })
        })
      )
    }

    if (toolName === "oracle.get_adoption_stats") {
      const adminToken = req.headers["x-admin-token"]
      if (!adminToken || String(adminToken) !== String(process.env.ADMIN_TOKEN || "")) {
        return reply.send(
          jsonRpcError(requestId, -32001, "Unauthorized", {
            error: "invalid_admin_token"
          })
        )
      }

      return reply.send(
        jsonRpcResult(requestId, {
          content: contentJson(getDiscoveryStats())
        })
      )
    }

    if (toolName === "oracle.verify_response" || toolName === "oracle.verify_batch") {
      const auth = requireApiKey(req)
      if (!auth.ok) {
        const error = auth.error
        return reply.send({
          ...error,
          id: requestId
        })
      }

      if (toolName === "oracle.verify_response") {
        const prompt = String(args.prompt ?? "")
        const response = String(args.response ?? "")
        const domain = String(args.domain ?? "general")
        const verificationMode = normalizeVerificationMode(args.mode)
        const verifyAmount = getVerifyAmount(verificationMode)
        const idempotencyKey =
          typeof args.idempotency_key === "string" ? args.idempotency_key : undefined

        const usageId = randomUUID()
        const debit = chargeAndRecordUsage({
          usageId,
          accountId: auth.resolved.account_id,
          service: "verify",
          costUsdc: verifyAmount,
          reference: idempotencyKey
        })

        if (!debit.ok) {
          if (debit.error === "insufficient_balance") {
            return reply.send(
              jsonRpcError(requestId, -32002, "Payment required", {
                ...economicError("insufficient_balance"),
                ...buildInsufficientBalanceDetails({
                  service: "verify",
                  costMicrousdc: usdcAmountToMicrousdc(verifyAmount),
                  costUsdc: verifyAmount,
                  balanceMicrousdc: Number(debit.balance_microusdc ?? 0)
                })
              })
            )
          }

          return reply.send(
            jsonRpcError(
              requestId,
              -32002,
              "Payment required",
              economicError(String(debit.error))
            )
          )
        }

        const verification = runVerification({
          prompt,
          response,
          domain,
          mode: verificationMode,
          accountId: auth.resolved.account_id,
          usageId,
          paymentRef: null
        })
        trackServiceEvent(req, "verify_success", "/mcp")

        return reply.send(
          jsonRpcResult(requestId, {
            content: contentJson({
              billed: {
                mode: "account",
                cost_usdc: verifyAmount,
                cost_microusdc: debit.billed_cost_microusdc,
                remaining_balance_usdc: debit.remaining_balance_usdc,
                remaining_balance_microusdc: debit.remaining_balance_microusdc,
                ...(debit.idempotent_replay ? { idempotent_replay: true } : {})
              },
              result: {
                ...verification.result,
                trust_score: verification.trust_score,
                risk_level: verification.risk_level,
                trust_recommended_action: verification.trust_recommended_action,
                confidence_band: verification.confidence_band,
                signals: verification.signals,
                verification_mode: verification.verification_mode,
                semantic_judge: verification.semantic_judge,
                historical_context: verification.historical_context,
                trust_receipt: verification.trust_receipt,
                oracle: {
                  version: ENGINE_VERSION,
                  signals_version: ORACLE_SIGNALS_VERSION,
                  trust_signing_enabled: TRUST_SIGNING_ENABLED
                }
              }
            })
          })
        )
      }

      const items = Array.isArray(args.items) ? args.items : null
      if (!items) {
        return reply.send(
          jsonRpcError(requestId, -32602, "Invalid params", {
            error: "invalid_batch_items"
          })
        )
      }

      if (items.length === 0) {
        return reply.send(
          jsonRpcError(requestId, -32602, "Invalid params", {
            error: "empty_batch"
          })
        )
      }

      if (items.length > 100) {
        return reply.send(
          jsonRpcError(requestId, -32602, "Invalid params", {
            error: "batch_limit_exceeded",
            max_items: 100
          })
        )
      }

      const normalizedItems = items.map((item) => {
        const row = item as Record<string, unknown>
        return {
          prompt: String(row.prompt ?? ""),
          response: String(row.response ?? ""),
          domain: String(row.domain ?? "general")
        }
      })
      const idempotencyKey =
        typeof args.idempotency_key === "string" ? args.idempotency_key : undefined
      const batchAmount = getBatchAmount(normalizedItems.length)
      const usageId = randomUUID()
      const debit = chargeAndRecordUsage({
        usageId,
        accountId: auth.resolved.account_id,
        service: "verify_batch",
        costUsdc: batchAmount,
        reference: idempotencyKey
      })

      if (!debit.ok) {
        if (debit.error === "insufficient_balance") {
          return reply.send(
            jsonRpcError(requestId, -32002, "Payment required", {
              ...economicError("insufficient_balance"),
              ...buildInsufficientBalanceDetails({
                service: "verify_batch",
                costMicrousdc: usdcAmountToMicrousdc(batchAmount),
                costUsdc: batchAmount,
                balanceMicrousdc: Number(debit.balance_microusdc ?? 0),
                batchSize: normalizedItems.length,
                includeDevCreditUrl: true
              })
            })
          )
        }

        return reply.send(
          jsonRpcError(
            requestId,
            -32002,
            "Payment required",
            economicError(String(debit.error))
          )
        )
      }

      const verification = runBatchVerification(normalizedItems, {
        accountId: auth.resolved.account_id,
        usageId,
        paymentRef: null
      })
      trackServiceEvent(req, "verify_batch_success", "/mcp")

      return reply.send(
        jsonRpcResult(requestId, {
          content: contentJson({
            billed: {
              mode: "account",
              cost_usdc: batchAmount,
              cost_microusdc: debit.billed_cost_microusdc,
              remaining_balance_usdc: debit.remaining_balance_usdc,
              remaining_balance_microusdc: debit.remaining_balance_microusdc,
              ...(debit.idempotent_replay ? { idempotent_replay: true } : {})
            },
            batch_size: verification.results.length,
            results: verification.results.map((item) => ({
              ...item.result,
              trust_score: item.trust_score,
              risk_level: item.risk_level,
              trust_recommended_action: item.trust_recommended_action,
              confidence_band: item.confidence_band,
              signals: item.signals,
              historical_context: item.historical_context,
              trust_receipt: item.trust_receipt
            })),
            summary: verification.summary,
            oracle: {
              version: ENGINE_VERSION,
              signals_version: ORACLE_SIGNALS_VERSION,
              trust_signing_enabled: TRUST_SIGNING_ENABLED
            }
          })
        })
      )
    }

    return reply.send(
      jsonRpcError(requestId, -32601, "Tool not found", {
        error: "unknown_tool",
        tool: toolName
      })
    )
  })
}
