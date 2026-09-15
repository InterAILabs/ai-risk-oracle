export type AutonomousRiskLevel = "low" | "medium" | "high"
export type GatewayDecision = "allow" | "review_required" | "block"

export const CANONICAL_ACTION_SCHEMA = "interai-canonical-action/v1" as const
export const HOST_EXECUTION_CONTEXT_SCHEMA = "interai-host-execution-context/v1" as const
export const EXECUTION_INTENT_SCHEMA = "interai-canonical-execution-intent/v2" as const
export const EXECUTION_AUTHORIZATION_SCHEMA = "interai-execution-authorization/v1" as const
export const DEFAULT_EXECUTION_AUTHORIZATION_TTL_SECONDS = 60
export const MAX_EXECUTION_AUTHORIZATION_TTL_SECONDS = 300

/** The trusted action envelope is constructed by the host execution boundary, not inferred from agent free text. */
export type CanonicalActionEnvelope = {
  schema: typeof CANONICAL_ACTION_SCHEMA
  tool_id: string
  type: string
  operation: string
  arguments: Record<string, unknown>
  external_side_effect: boolean
  irreversible: boolean
  destination?: string
  resource?: string
}

export type HostExecutionContext = {
  schema: typeof HOST_EXECUTION_CONTEXT_SCHEMA
  workspace_id: string
  environment: string
  actor_id?: string
  run_id?: string
}

/** The exact public object bound to an execution authorization. */
export type CanonicalExecutionIntent = {
  schema: typeof EXECUTION_INTENT_SCHEMA
  action_authority: "host_attested_canonical" | "caller_proposed_legacy"
  canonical_action: Record<string, unknown>
  evaluation_context: Record<string, unknown>
  authoritative_context: Record<string, unknown>
  policy_authority: Record<string, unknown>
}

export type ExecutionAuthorization = {
  schema: typeof EXECUTION_AUTHORIZATION_SCHEMA
  decision_id: string
  decision: "allow"
  execution_intent_digest: string
  issued_at: string
  expires_at: string
  single_use: true
}

export type ExecutionReceipt = {
  receipt_schema_version: "execution-receipt/v1"
  decision_id: string
  execution_intent_digest: string
  status: "dispatched" | "succeeded" | "failed" | "unknown"
  observed_at: string
  correlation_id?: string
  evidence_source: string
}

export type DispatchValidation =
  | { ok: true; execution_intent_digest: string }
  | { ok: false; code: "decision_not_authorizing" | "execution_intent_mismatch" | "decision_expired" | "receipt_signature_invalid" | "authorization_replayed" }

/** Must atomically insert a unique key in durable host-owned storage. Errors must throw. */
export interface ExecutionAuthorizationReplayStore {
  consumeOnce(key: string): boolean | Promise<boolean>
}

function normalizeJson(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(normalizeJson)
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>)
        .filter(([, item]) => item !== undefined)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([key, item]) => [key, normalizeJson(item)])
    )
  }
  return value
}

/** Canonical JSON used by the hosted execution-intent digest contract. */
export function canonicalExecutionIntentJson(intent: CanonicalExecutionIntent): string {
  return JSON.stringify(normalizeJson(intent))
}

/** Returns the SHA-256 hex digest to compare with `execution_intent_digest` before dispatch. */
export async function executionIntentDigest(intent: CanonicalExecutionIntent): Promise<string> {
  const bytes = new TextEncoder().encode(canonicalExecutionIntentJson(intent))
  const hash = await globalThis.crypto.subtle.digest("SHA-256", bytes)
  return Array.from(new Uint8Array(hash), (byte) => byte.toString(16).padStart(2, "0")).join("")
}

/** Fail-closed local validation. Signature verification remains a service call. */
export async function validateExecutionAuthorization(input: {
  authorization: ExecutionAuthorization | null | undefined
  finalIntent: CanonicalExecutionIntent
  receiptSignatureValid: boolean
  now?: Date
}): Promise<DispatchValidation> {
  if (!input.receiptSignatureValid) return { ok: false, code: "receipt_signature_invalid" }
  if (!input.authorization || input.authorization.decision !== "allow" ||
      input.authorization.schema !== EXECUTION_AUTHORIZATION_SCHEMA ||
      input.authorization.single_use !== true || !input.authorization.decision_id) {
    return { ok: false, code: "decision_not_authorizing" }
  }
  const expiresAt = new Date(input.authorization.expires_at)
  const issuedAt = new Date(input.authorization.issued_at)
  const now = input.now ?? new Date()
  const ttl = expiresAt.getTime() - issuedAt.getTime()
  if (!Number.isFinite(ttl) || ttl < 1000 || ttl > 300_000 || issuedAt > now || expiresAt <= now) {
    return { ok: false, code: "decision_expired" }
  }
  const digest = await executionIntentDigest(input.finalIntent)
  if (digest !== input.authorization.execution_intent_digest) {
    return { ok: false, code: "execution_intent_mismatch" }
  }
  return { ok: true, execution_intent_digest: digest }
}

export type VerifyRequest = {
  use_case: string
  action: CanonicalActionEnvelope | {
    type: string
    name?: string
    description: string
    amount_usd?: number
    currency?: string
    irreversible?: boolean
    external_side_effect?: boolean
    [key: string]: unknown
  }
  context?: {
    agent_id?: string
    environment?: string
    counterparty_id?: string
    user_confirmation?: boolean
    [key: string]: unknown
  }
  /** Required with a canonical action for executable pilot authorization. Host-attested values are bound into the intent. */
  execution_context?: HostExecutionContext
  /** 1–300 seconds; defaults to 60 seconds for canonical Bearer pilot requests. */
  authorization_ttl_seconds?: number
  policy?: {
    max_risk_level?: AutonomousRiskLevel
    require_trust_receipt?: boolean
    amount_usd_limit?: number
    blocked_action_types?: string[]
    allowed_action_types?: string[]
    allowed_action_types_enforced?: boolean
    require_human_review_above?: number
    require_user_confirmation_for_irreversible?: boolean
    [key: string]: unknown
  }
  domain?: string
  mode?: "fast_heuristic" | "semantic_judge"
  external_evidence?: unknown[]
}

export type PolicyViolation = {
  code: string
  message: string
  severity: GatewayDecision
}

export type VerifySignals = {
  semantic_relevance?: number
  contradiction_risk?: number
  unsupported_specificity?: number
  numeric_consistency?: number
  overconfidence?: number
  has_external_side_effect?: boolean | null
  is_irreversible?: boolean | null
  involves_money?: boolean
  amount_usd?: number | null
  requires_user_confirmation?: boolean
  has_counterparty?: boolean
  environment?: string
  action_type?: string | null
  unknown_critical_fields?: string[]
  autonomous_execution_detected?: boolean
  [key: string]: unknown
}

export type VerifyResponse = {
  decision_id: string
  request_contract: "autonomous_execution"
  score: number
  risk_level: AutonomousRiskLevel
  signals: VerifySignals
  recommended_action: GatewayDecision
  policy_result: GatewayDecision
  policy_violations: PolicyViolation[]
  trust_receipt_id?: string
  /** Digest of the exact canonical intent evaluated; compare against the host's final intent before dispatch. */
  execution_intent_digest?: string
  execution_intent?: CanonicalExecutionIntent
  execution_authorization?: ExecutionAuthorization | null
  trust_receipt?: Record<string, unknown>
  [key: string]: unknown
}

export type InterAIClientOptions = {
  baseUrl: string
  apiKey?: string
  clientName?: string
  timeoutMs?: number
}

export type OnboardResponse = Record<string, unknown> & {
  api_key?: string
}

export type X402PaymentRequiredResponse = Record<string, unknown> & {
  x402Version: number
  accepts: unknown[]
}

export class OracleHttpError extends Error {
  readonly status: number
  readonly body: unknown
  readonly code: string | null
  readonly headers: Record<string, string>
  readonly paymentRequired: X402PaymentRequiredResponse | null

  constructor(input: {
    method: string
    path: string
    status: number
    body: unknown
    headers: Record<string, string>
  }) {
    super(`InterAI request failed: ${input.method} ${input.path} ${input.status} ${JSON.stringify(input.body)}`)
    this.name = "OracleHttpError"
    this.status = input.status
    this.body = input.body
    this.headers = input.headers
    this.code = input.body && typeof input.body === "object" && "error" in input.body &&
      typeof (input.body as { error?: unknown }).error === "string"
      ? String((input.body as { error: string }).error)
      : null
    this.paymentRequired = input.status === 402 && input.body && typeof input.body === "object" &&
      (input.body as { x402Version?: unknown }).x402Version === 2 &&
      Array.isArray((input.body as { accepts?: unknown }).accepts)
      ? input.body as X402PaymentRequiredResponse
      : null
  }
}

/** Anonymous receipt lookup: existence reference only, never signed evidence. */
export type TrustReceiptPublicSummary = {
  ok: true
  visibility: "public_summary"
  receipt: {
    receipt_id: string
    issued_at: string
  }
  full_receipt_requires_owner: true
}

/** Complete owner-authenticated receipt lookup with opaque signed payload bytes. */
export type TrustReceiptLookup = {
  ok: true
  receipt: Record<string, unknown> & { receipt_id: string }
  verification: {
    signed: boolean
    signature: string | null
    signature_alg: "hmac-sha256" | null
    verification_scope?: "service_verifiable"
    signed_payload: string | null
    signature_valid?: boolean
  }
  metadata?: Record<string, unknown>
  [key: string]: unknown
}

export type TrustReceiptLookupResponse = TrustReceiptLookup | TrustReceiptPublicSummary

function isPublicReceiptSummary(value: TrustReceiptLookupResponse): value is TrustReceiptPublicSummary {
  return "visibility" in value && value.visibility === "public_summary"
}

function defaultIdempotencyKey(): string {
  const random = globalThis.crypto?.randomUUID?.()
  return random || `interai-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 12)}`
}

function responseHeaders(response: Response): Record<string, string> {
  const headers: Record<string, string> = {}
  response.headers.forEach((value, key) => {
    headers[key] = value
  })
  return headers
}

export class InterAIRiskOracleClient {
  readonly baseUrl: string
  apiKey?: string
  readonly clientName: string
  readonly timeoutMs: number

  constructor(options: InterAIClientOptions) {
    this.baseUrl = options.baseUrl.replace(/\/$/, "")
    this.apiKey = options.apiKey
    this.clientName = options.clientName || "typescript-sdk/0.1.3-beta"
    this.timeoutMs = options.timeoutMs ?? 10_000
  }

  setApiKey(apiKey: string): void {
    this.apiKey = apiKey
  }

  private async jsonRequest(path: string, init?: RequestInit, timeoutMs?: number): Promise<unknown> {
    const controller = new AbortController()
    const callerSignal = init?.signal
    const abortFromCaller = () => controller.abort(callerSignal?.reason)
    if (callerSignal?.aborted) abortFromCaller()
    else callerSignal?.addEventListener("abort", abortFromCaller, { once: true })
    const timeout = setTimeout(
      () => controller.abort(new Error("InterAI request timed out")),
      timeoutMs ?? this.timeoutMs
    )

    let response: Response
    try {
      response = await fetch(`${this.baseUrl}${path}`, {
        ...init,
        signal: controller.signal,
        headers: {
          ...(this.apiKey ? { authorization: `Bearer ${this.apiKey}` } : {}),
          "x-interai-client": this.clientName,
          ...(init?.headers || {})
        }
      })
    } finally {
      clearTimeout(timeout)
      callerSignal?.removeEventListener("abort", abortFromCaller)
    }

    const text = await response.text()
    let body: unknown
    try {
      body = text ? JSON.parse(text) : null
    } catch {
      body = { error: "invalid_json_response", raw: text.slice(0, 500) }
    }
    if (!response.ok) {
      throw new OracleHttpError({
        method: init?.method || "GET",
        path,
        status: response.status,
        body,
        headers: responseHeaders(response)
      })
    }
    return body
  }

  async getPricing(): Promise<Record<string, unknown>> {
    return this.jsonRequest("/pricing") as Promise<Record<string, unknown>>
  }

  async getDiscoveryBundle(): Promise<Record<string, unknown>> {
    return this.jsonRequest("/.well-known/discovery-bundle.json") as Promise<Record<string, unknown>>
  }

  async onboard(input: {
    name?: string
    account_id?: string
    api_key_name?: string
    recommended_topup_usdc?: string
  } = {}): Promise<OnboardResponse> {
    const result = await this.jsonRequest("/onboard", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(input)
    }) as OnboardResponse
    if (typeof result.api_key === "string" && result.api_key) this.apiKey = result.api_key
    return result
  }

  async me(): Promise<Record<string, unknown>> {
    return this.jsonRequest("/me") as Promise<Record<string, unknown>>
  }

  async ledger(limit = 20): Promise<Record<string, unknown>> {
    return this.jsonRequest(`/ledger?limit=${encodeURIComponent(String(limit))}`) as Promise<Record<string, unknown>>
  }

  async usage(limit = 20): Promise<Record<string, unknown>> {
    return this.jsonRequest(`/usage?limit=${encodeURIComponent(String(limit))}`) as Promise<Record<string, unknown>>
  }

  async quote(input: {
    service?: "verify"
    mode?: "fast" | "batch"
    items_count?: number
  } = {}): Promise<Record<string, unknown>> {
    return this.jsonRequest("/quote", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        service: input.service ?? "verify",
        mode: input.mode ?? "fast",
        ...(input.items_count !== undefined ? { items_count: input.items_count } : {})
      })
    }) as Promise<Record<string, unknown>>
  }

  async createTopup(amountUsdc = "0.10"): Promise<Record<string, unknown>> {
    return this.jsonRequest("/topup/create", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ amount_usdc: amountUsdc })
    }) as Promise<Record<string, unknown>>
  }

  async topupStatus(topupId: string): Promise<Record<string, unknown>> {
    return this.jsonRequest(`/topup/${encodeURIComponent(topupId)}`) as Promise<Record<string, unknown>>
  }

  async confirmTopup(topupId: string, txHash: string): Promise<Record<string, unknown>> {
    return this.jsonRequest("/topup/confirm", {
      method: "POST",
      headers: {
        "X-Topup-Id": topupId,
        "X-Tx-Hash": txHash
      }
    }) as Promise<Record<string, unknown>>
  }

  async verify(
    request: VerifyRequest,
    idempotencyKey = defaultIdempotencyKey(),
    options: { signal?: AbortSignal; timeoutMs?: number } = {}
  ): Promise<VerifyResponse> {
    return this.jsonRequest("/verify", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-idempotency-key": idempotencyKey
      },
      body: JSON.stringify(request),
      signal: options.signal
    }, options.timeoutMs) as Promise<VerifyResponse>
  }

  async verifyBatch(
    requests: VerifyRequest[],
    idempotencyKey = defaultIdempotencyKey(),
    options: { signal?: AbortSignal; timeoutMs?: number } = {}
  ): Promise<Record<string, unknown>> {
    return this.jsonRequest("/verify/batch", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-idempotency-key": idempotencyKey
      },
      body: JSON.stringify({ items: requests }),
      signal: options.signal
    }, options.timeoutMs) as Promise<Record<string, unknown>>
  }

  /** Return the privacy-aware lookup union without requiring owner credentials. */
  async getTrustReceiptReference(receiptId: string): Promise<TrustReceiptLookupResponse> {
    return this.jsonRequest(
      `/trust/receipts/${encodeURIComponent(receiptId)}`
    ) as Promise<TrustReceiptLookupResponse>
  }

  /** Return complete signed evidence; throws when the service only returns the anonymous summary. */
  async getTrustReceipt(receiptId: string): Promise<TrustReceiptLookup> {
    const result = await this.getTrustReceiptReference(receiptId)
    if (isPublicReceiptSummary(result)) {
      throw new Error("Complete receipt requires the owning account API key")
    }
    return result
  }

  /** Authenticate the exact receipt, validate its grant, then durably consume before dispatch. */
  async validateAndConsumeReceipt(input: {
    lookup: TrustReceiptLookup
    finalIntent: CanonicalExecutionIntent
    replayStore: ExecutionAuthorizationReplayStore
  }): Promise<DispatchValidation> {
    // Snapshot before the HTTP await so a caller cannot swap fields after verification.
    const lookup = structuredClone(input.lookup)
    const finalIntent = structuredClone(input.finalIntent)
    const receipt = lookup.receipt
    const authorization = receipt.execution_authorization as ExecutionAuthorization | undefined
    if (receipt.receipt_schema_version !== "trust-receipt/v2" ||
        receipt.request_contract !== "autonomous_execution" || receipt.final_decision !== "allow" ||
        !authorization || authorization.decision_id !== receipt.receipt_id ||
        authorization.execution_intent_digest !== receipt.execution_intent_digest) {
      return { ok: false, code: "decision_not_authorizing" }
    }
    const signature = await this.verifyTrustReceiptSignature(lookup)
    const validation = await validateExecutionAuthorization({ authorization, finalIntent, receiptSignatureValid: signature.valid })
    if (!validation.ok) return validation
    if (!await input.replayStore.consumeOnce(`${authorization.decision_id}:${authorization.execution_intent_digest}`)) {
      return { ok: false, code: "authorization_replayed" }
    }
    // Consumption can involve I/O; reject expiration before handing control to the executor.
    return validateExecutionAuthorization({ authorization, finalIntent, receiptSignatureValid: true })
  }

  async verifyTrustReceiptSignature(
    lookup: TrustReceiptLookup
  ): Promise<{ valid: boolean; signature_alg: "hmac-sha256" }> {
    const { receipt, verification } = lookup
    if (!verification.signature || !verification.signed_payload) {
      throw new Error("Trust receipt is not signed")
    }
    return this.jsonRequest("/trust/verify-signature", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        receipt_id: receipt.receipt_id,
        receipt,
        signed_payload: verification.signed_payload,
        signature: verification.signature,
        signature_alg: verification.signature_alg
      })
    }) as Promise<{ valid: boolean; signature_alg: "hmac-sha256" }>
  }
}
