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
  | { ok: false; code: "decision_not_authorizing" | "execution_intent_mismatch" | "decision_expired" | "receipt_signature_invalid" }

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
  if (!input.authorization || input.authorization.decision !== "allow") {
    return { ok: false, code: "decision_not_authorizing" }
  }
  const expiresAt = new Date(input.authorization.expires_at)
  if (Number.isNaN(expiresAt.getTime()) || expiresAt <= (input.now ?? new Date())) {
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
}

export type TrustReceiptLookup = {
  ok: true
  receipt: Record<string, unknown> & { receipt_id: string }
  verification: {
    signed: boolean
    signature: string | null
    signature_alg: "hmac-sha256" | null
    signed_payload: string | null
  }
  [key: string]: unknown
}

function defaultIdempotencyKey(): string {
  const random = globalThis.crypto?.randomUUID?.()
  return random || `interai-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 12)}`
}

export class InterAIRiskOracleClient {
  readonly baseUrl: string
  readonly apiKey?: string
  readonly clientName: string

  constructor(options: InterAIClientOptions) {
    this.baseUrl = options.baseUrl.replace(/\/$/, "")
    this.apiKey = options.apiKey
    this.clientName = options.clientName || "typescript-sdk/0.1.3-beta"
  }

  private async jsonRequest(path: string, init?: RequestInit): Promise<unknown> {
    const response = await fetch(`${this.baseUrl}${path}`, {
      ...init,
      headers: {
        ...(this.apiKey ? { authorization: `Bearer ${this.apiKey}` } : {}),
        "x-interai-client": this.clientName,
        ...(init?.headers || {})
      }
    })
    const text = await response.text()
    let body: unknown
    try {
      body = text ? JSON.parse(text) : null
    } catch {
      body = { error: "invalid_json_response", raw: text.slice(0, 500) }
    }
    if (!response.ok) {
      throw new Error(`InterAI request failed: ${response.status} ${JSON.stringify(body)}`)
    }
    return body
  }

  async verify(
    request: VerifyRequest,
    idempotencyKey = defaultIdempotencyKey()
  ): Promise<VerifyResponse> {
    return this.jsonRequest("/verify", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-idempotency-key": idempotencyKey
      },
      body: JSON.stringify(request)
    }) as Promise<VerifyResponse>
  }

  async getTrustReceipt(receiptId: string): Promise<TrustReceiptLookup> {
    return this.jsonRequest(
      `/trust/receipts/${encodeURIComponent(receiptId)}`
    ) as Promise<TrustReceiptLookup>
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
        signed_payload: verification.signed_payload,
        signature: verification.signature,
        signature_alg: verification.signature_alg
      })
    }) as Promise<{ valid: boolean; signature_alg: "hmac-sha256" }>
  }
}
