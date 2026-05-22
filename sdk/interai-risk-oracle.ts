export type VerifyInput = {
  prompt: string
  response: string
  domain?: string
}

export type BatchVerifyInput = {
  items: VerifyInput[]
}

export type OracleClientOptions = {
  baseUrl: string
  apiKey?: string
}

export type RiskLevel = "low" | "medium" | "high"

export type RecommendedAction = "accept" | "review" | "reject"

export type ConfidenceBand = "low" | "medium" | "high"

export type TrustSignals = {
  semantic_relevance: number
  contradiction_risk: number
  unsupported_specificity: number
  numeric_consistency: number
  overconfidence: number
}

export type DecisionBasis = {
  dominant_negatives: string[]
  dominant_positives: string[]
}

export type TrustReceipt = {
  receipt_id: string
  issued_at: string
  oracle_version: string
  signals_version: string
  request_hash: string
  response_hash?: string
  domain?: string
  trust_score?: number
  risk_level?: RiskLevel
  recommended_action?: RecommendedAction
  confidence_band?: ConfidenceBand
  risk_factors?: string[]
  claims_checked?: number
  claims_supported?: number
  claims_uncertain?: number
  decision_basis: DecisionBasis
}

export type SignedTrustReceipt = TrustReceipt & {
  signature: string | null
  signature_alg: "hmac-sha256" | null
  signed: boolean
}

export type VerifyAnalysis = {
  prompt_response_alignment: number
  prompt_response_alignment_adjusted: number
  contradictions_detected: boolean
  numerical_conflicts: boolean
  absolute_claims: number
  latency_ms: number
  engine_latency_ms: number
  total_latency_ms: number
  engine_version: string
}

export type OracleMeta = {
  version: string
  signals_version: string
  trust_signing_enabled: boolean
}

export type X402PaymentRequirements = {
  scheme: string
  network: string
  amount: string
  asset: string
  payTo: string
  maxTimeoutSeconds?: number
  extra?: Record<string, unknown>
}

export type X402PaymentRequiredResponse = {
  x402Version: number
  error: string
  resource?: {
    url?: string
    description?: string
    mimeType?: string
    serviceName?: string
    tags?: string[]
    [key: string]: unknown
  }
  accepts: X402PaymentRequirements[]
  extensions?: Record<string, unknown>
  [key: string]: unknown
}

export type HistoricalTrustContext = {
  available: boolean
  scope: "account_domain" | "none"
  domain: string
  sample_size: number
  average_trust_score: number | null
  min_trust_score: number | null
  max_trust_score: number | null
  high_risk_count: number
  medium_risk_count: number
  low_risk_count: number
  high_risk_rate: number | null
  latest_receipt_at: string | null
  prior_to_current: boolean
  reason?: "account_history_unavailable" | "insufficient_history"
}

export type VerifyResult = {
  consistency_score: number
  hallucination_risk: number
  risk_level: RiskLevel
  recommended_action: RecommendedAction
  analysis: VerifyAnalysis
  trust_score: number
  trust_recommended_action: RecommendedAction
  confidence_band: ConfidenceBand
  signals: TrustSignals
  historical_context: HistoricalTrustContext
  trust_receipt: SignedTrustReceipt
  billed: BillingInfo
  oracle: OracleMeta
}

export type BillingInfo = {
  mode: "account" | "payment_reference" | "x402"
  cost_usdc: string
  cost_microusdc?: number
  remaining_balance_usdc?: string
  remaining_balance_microusdc?: number
  idempotent_replay?: boolean
  payer?: string | null
  transaction?: string
  network?: string
}

export type BatchVerifyResult = {
  ok: true
  batch_size: number
  billed: BillingInfo
  results: VerifyResult[]
  summary: {
    count: number
    avg_consistency_score: number
    high_risk_count: number
  }
  oracle: OracleMeta
}

export type OnboardResponse = {
  ok?: boolean
  account?: Record<string, unknown>
  api_key?: string
  api_key_record?: Record<string, unknown>
  balance?: Record<string, unknown>
  funding?: Record<string, unknown>
  trial?: Record<string, unknown>
  [key: string]: unknown
}

export type AccountResponse = Record<string, unknown>

export type LedgerResponse = Record<string, unknown>

export type UsageResponse = Record<string, unknown>

export type PricingResponse = {
  ok: true
  service: string
  version: string
  pricing: Record<string, unknown>
}

export type TopupResponse = Record<string, unknown>

export type TrustReceiptsResponse = {
  ok?: boolean
  receipts?: Array<SignedTrustReceipt & Record<string, unknown>>
  [key: string]: unknown
}

export type TrustReputationResponse = {
  ok: true
  reputation: {
    available: boolean
    account_id: string
    sample_size: number
    reputation_score: number | null
    average_trust_score: number | null
    high_risk_count: number
    medium_risk_count: number
    low_risk_count: number
    high_risk_rate: number | null
    first_receipt_at: string | null
    latest_receipt_at: string | null
    domains: Array<{
      domain: string
      sample_size: number
      average_trust_score: number | null
      reputation_score: number | null
      high_risk_count: number
      medium_risk_count: number
      low_risk_count: number
      high_risk_rate: number | null
      latest_receipt_at: string | null
    }>
  }
}

export type PublicTrustReceiptResponse = {
  ok: true
  receipt: TrustReceipt
  verification: {
    signed: boolean
    signature: string | null
    signature_alg: "hmac-sha256" | null
  }
  trust: {
    domain: string
    trust_score: number
    risk_level: RiskLevel
    confidence_band: ConfidenceBand
  }
}

export type SignatureVerificationResponse = {
  valid: boolean
  signature_alg: "hmac-sha256"
}

export type JsonRpcResponse<T = unknown> = {
  jsonrpc: "2.0"
  id: string | number | null
  result?: T
  error?: {
    code: number
    message: string
    data?: Record<string, unknown>
  }
}

export type A2AResponse = JsonRpcResponse<Record<string, unknown>>

export type McpResponse = JsonRpcResponse<Record<string, unknown>>

export type A2AMessagePart =
  | {
      kind: "text"
      text: string
    }
  | {
      kind: "data"
      data: Record<string, unknown>
    }

export type A2AMessageSendInput = {
  message: {
    role: "user"
    messageId?: string
    contextId?: string
    parts: A2AMessagePart[]
  }
  metadata?: Record<string, unknown>
  id?: string | number | null
}

export type McpRequestInput = {
  id?: string | number | null
  method:
    | "initialize"
    | "notifications/initialized"
    | "tools/list"
    | "tools/call"
    | "resources/list"
    | "resources/read"
    | "prompts/list"
    | "prompts/get"
  params?: Record<string, unknown>
}

type RequestOptions = {
  method?: string
  path: string
  headers?: Record<string, string>
  body?: unknown
}

export class OracleHttpError extends Error {
  status: number
  body: unknown
  headers: Record<string, string>
  paymentRequired: X402PaymentRequiredResponse | null

  constructor(params: {
    method: string
    path: string
    status: number
    body: unknown
    headers: Record<string, string>
  }) {
    super(`${params.method} ${params.path} failed: ${params.status} ${JSON.stringify(params.body)}`)
    this.name = "OracleHttpError"
    this.status = params.status
    this.body = params.body
    this.headers = params.headers
    this.paymentRequired =
      params.status === 402 && isX402PaymentRequiredResponse(params.body)
        ? params.body
        : null
  }
}

function isX402PaymentRequiredResponse(value: unknown): value is X402PaymentRequiredResponse {
  if (!value || typeof value !== "object") return false

  const candidate = value as { x402Version?: unknown; accepts?: unknown }
  return candidate.x402Version === 2 && Array.isArray(candidate.accepts)
}

function responseHeaders(response: Response) {
  const headers: Record<string, string> = {}
  response.headers.forEach((value, key) => {
    headers[key] = value
  })
  return headers
}

export class InterAIRiskOracleClient {
  baseUrl: string
  apiKey?: string

  constructor(options: OracleClientOptions) {
    this.baseUrl = options.baseUrl.replace(/\/+$/, "")
    this.apiKey = options.apiKey
  }

  setApiKey(apiKey: string) {
    this.apiKey = apiKey
  }

  private buildHeaders(extra?: Record<string, string>) {
    const headers: Record<string, string> = {
      ...(extra || {})
    }

    if (this.apiKey) {
      headers.Authorization = `Bearer ${this.apiKey}`
    }

    return headers
  }

  private async request<T = unknown>(options: RequestOptions): Promise<T> {
    const method = options.method || "GET"
    const hasBody = options.body !== undefined
    const headers = this.buildHeaders({
      ...(hasBody ? { "content-type": "application/json" } : {}),
      ...(options.headers || {})
    })

    const response = await fetch(`${this.baseUrl}${options.path}`, {
      method,
      headers,
      body: hasBody ? JSON.stringify(options.body) : undefined
    })

    const text = await response.text()
    let json: any

    try {
      json = text ? JSON.parse(text) : null
    } catch {
      json = { raw: text }
    }

    if (!response.ok) {
      throw new OracleHttpError({
        method,
        path: options.path,
        status: response.status,
        body: json,
        headers: responseHeaders(response)
      })
    }

    return json as T
  }

  async getRoot(): Promise<Record<string, unknown>> {
    return this.request<Record<string, unknown>>({
      path: "/"
    })
  }

  async getOpenApi(): Promise<Record<string, unknown>> {
    return this.request<Record<string, unknown>>({
      path: "/.well-known/openapi.json"
    })
  }

  async getServiceDescriptor(): Promise<Record<string, unknown>> {
    return this.request<Record<string, unknown>>({
      path: "/.well-known/ai-service.json"
    })
  }

  async getAgentCard(): Promise<Record<string, unknown>> {
    return this.request<Record<string, unknown>>({
      path: "/.well-known/agent.json"
    })
  }

  async getDiscoveryBundle(): Promise<Record<string, unknown>> {
    return this.request<Record<string, unknown>>({
      path: "/.well-known/discovery-bundle.json"
    })
  }

  async getPricing(): Promise<PricingResponse> {
    return this.request<PricingResponse>({
      path: "/pricing"
    })
  }

  async onboard(input?: {
    account_id?: string
    name?: string
    api_key_name?: string
    recommended_topup_usdc?: string
  }): Promise<OnboardResponse> {
    const result = await this.request<OnboardResponse>({
      method: "POST",
      path: "/onboard",
      body: input || {}
    })

    if (result.api_key) {
      this.apiKey = result.api_key
    }

    return result
  }

  async me(): Promise<AccountResponse> {
    return this.request<AccountResponse>({
      path: "/me"
    })
  }

  async ledger(limit = 20): Promise<LedgerResponse> {
    return this.request<LedgerResponse>({
      path: `/ledger?limit=${encodeURIComponent(String(limit))}`
    })
  }

  async usage(limit = 20): Promise<UsageResponse> {
    return this.request<UsageResponse>({
      path: `/usage?limit=${encodeURIComponent(String(limit))}`
    })
  }

  async quote(input?: {
    service?: "verify"
    mode?: "fast" | "batch"
    items_count?: number
  }): Promise<Record<string, unknown>> {
    return this.request<Record<string, unknown>>({
      method: "POST",
      path: "/quote",
      body: {
        service: input?.service ?? "verify",
        mode: input?.mode ?? "fast",
        ...(input?.items_count ? { items_count: input.items_count } : {})
      }
    })
  }

  async createTopup(amountUsdc = "0.01"): Promise<TopupResponse> {
    return this.request<TopupResponse>({
      method: "POST",
      path: "/topup/create",
      body: { amount_usdc: amountUsdc }
    })
  }

  async topupStatus(topupId: string): Promise<TopupResponse> {
    return this.request<TopupResponse>({
      path: `/topup/${encodeURIComponent(topupId)}`
    })
  }

  async devCredit(amountUsdc = "0.01"): Promise<TopupResponse> {
    return this.request<TopupResponse>({
      method: "POST",
      path: "/topup/dev/credit",
      body: { amount_usdc: amountUsdc }
    })
  }

  async confirmTopup(
    topupId: string,
    txHash: string,
    fakeConfirm = false
  ): Promise<TopupResponse> {
    return this.request<TopupResponse>({
      method: "POST",
      path: "/topup/confirm",
      headers: {
        "X-Topup-Id": topupId,
        "X-Tx-Hash": txHash,
        ...(fakeConfirm ? { "X-Test-Confirm": "true" } : {})
      }
    })
  }

  async verify(
    input: VerifyInput,
    idempotencyKey?: string
  ): Promise<VerifyResult> {
    return this.request<VerifyResult>({
      method: "POST",
      path: "/verify",
      headers: idempotencyKey
        ? { "X-Idempotency-Key": idempotencyKey }
        : undefined,
      body: {
        prompt: input.prompt,
        response: input.response,
        domain: input.domain ?? "general"
      }
    })
  }

  async verifyBatch(
    input: BatchVerifyInput,
    idempotencyKey?: string
  ): Promise<BatchVerifyResult> {
    return this.request<BatchVerifyResult>({
      method: "POST",
      path: "/verify/batch",
      headers: idempotencyKey
        ? { "X-Idempotency-Key": idempotencyKey }
        : undefined,
      body: {
        items: input.items.map((item) => ({
          prompt: item.prompt,
          response: item.response,
          domain: item.domain ?? "general"
        }))
      }
    })
  }

  async a2aSend(input: A2AMessageSendInput): Promise<A2AResponse> {
    const messageId =
      input.message.messageId ??
      `client-message-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`
    const rpcId =
      input.id ??
      `rpc-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`

    return this.request<A2AResponse>({
      method: "POST",
      path: "/a2a",
      body: {
        jsonrpc: "2.0",
        id: rpcId,
        method: "message/send",
        params: {
          message: {
            role: "user",
            messageId,
            ...(input.message.contextId
              ? { contextId: input.message.contextId }
              : {}),
            parts: input.message.parts
          },
          ...(input.metadata ? { metadata: input.metadata } : {})
        }
      }
    })
  }

  async a2aVerify(
    input: VerifyInput,
    idempotencyKey?: string
  ): Promise<A2AResponse> {
    return this.a2aSend({
      message: {
        role: "user",
        parts: [
          {
            kind: "data",
            data: {
              prompt: input.prompt,
              response: input.response,
              domain: input.domain ?? "general"
            }
          }
        ]
      },
      ...(idempotencyKey
        ? {
            metadata: {
              idempotency_key: idempotencyKey
            }
          }
        : {})
    })
  }

  async a2aVerifyBatch(
    input: BatchVerifyInput,
    idempotencyKey?: string
  ): Promise<A2AResponse> {
    return this.a2aSend({
      message: {
        role: "user",
        parts: [
          {
            kind: "data",
            data: {
              items: input.items.map((item) => ({
                prompt: item.prompt,
                response: item.response,
                domain: item.domain ?? "general"
              }))
            }
          }
        ]
      },
      ...(idempotencyKey
        ? {
            metadata: {
              idempotency_key: idempotencyKey
            }
          }
        : {})
    })
  }

  async mcpRequest(input: McpRequestInput): Promise<McpResponse> {
    return this.request<McpResponse>({
      method: "POST",
      path: "/mcp",
      body: {
        jsonrpc: "2.0",
        id:
          input.id ??
          `mcp-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`,
        method: input.method,
        ...(input.params ? { params: input.params } : {})
      }
    })
  }

  async mcpInitialize(protocolVersion = "2025-11-25"): Promise<McpResponse> {
    return this.mcpRequest({
      method: "initialize",
      params: {
        protocolVersion,
        capabilities: {},
        clientInfo: {
          name: "interai-risk-oracle-sdk",
          version: "0.0.1"
        }
      }
    })
  }

  async mcpToolsList(): Promise<McpResponse> {
    return this.mcpRequest({
      method: "tools/list"
    })
  }

  async mcpResourcesList(): Promise<McpResponse> {
    return this.mcpRequest({
      method: "resources/list"
    })
  }

  async mcpResourceRead(uri: string): Promise<McpResponse> {
    return this.mcpRequest({
      method: "resources/read",
      params: {
        uri
      }
    })
  }

  async mcpPromptsList(): Promise<McpResponse> {
    return this.mcpRequest({
      method: "prompts/list"
    })
  }

  async mcpPromptGet(name: string): Promise<McpResponse> {
    return this.mcpRequest({
      method: "prompts/get",
      params: {
        name
      }
    })
  }

  async mcpToolCall(
    name: string,
    args?: Record<string, unknown>
  ): Promise<McpResponse> {
    return this.mcpRequest({
      method: "tools/call",
      params: {
        name,
        ...(args ? { arguments: args } : { arguments: {} })
      }
    })
  }

  async trustReceipts(limit = 50): Promise<TrustReceiptsResponse> {
    return this.request<TrustReceiptsResponse>({
      path: `/trust/receipts?limit=${encodeURIComponent(String(limit))}`
    })
  }

  async trustReputation(domainsLimit = 20): Promise<TrustReputationResponse> {
    return this.request<TrustReputationResponse>({
      path: `/trust/reputation?domains_limit=${encodeURIComponent(String(domainsLimit))}`
    })
  }

  async getTrustReceipt(receiptId: string): Promise<PublicTrustReceiptResponse> {
    return this.request<PublicTrustReceiptResponse>({
      path: `/trust/receipts/${encodeURIComponent(receiptId)}`
    })
  }

  async verifyTrustReceiptSignature(input: {
    receipt: Record<string, unknown>
    signature: string
    signature_alg?: "hmac-sha256"
  }): Promise<SignatureVerificationResponse> {
    return this.request<SignatureVerificationResponse>({
      method: "POST",
      path: "/trust/verify-signature",
      body: input
    })
  }
}
