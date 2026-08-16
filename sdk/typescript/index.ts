export type AutonomousRiskLevel = "low" | "medium" | "high"
export type GatewayDecision = "allow" | "review_required" | "block"

export type VerifyRequest = {
  use_case: string
  action: {
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
  policy?: {
    max_risk_level?: AutonomousRiskLevel
    require_trust_receipt?: boolean
    amount_usd_limit?: number
    blocked_action_types?: string[]
    allowed_action_types?: string[]
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
  trust_receipt?: Record<string, unknown>
  [key: string]: unknown
}

export type InterAIClientOptions = {
  baseUrl: string
  apiKey?: string
  clientName?: string
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
    this.clientName = options.clientName || "typescript-sdk/0.1.2-beta"
  }

  async verify(
    request: VerifyRequest,
    idempotencyKey = defaultIdempotencyKey()
  ): Promise<VerifyResponse> {
    const response = await fetch(`${this.baseUrl}/verify`, {
      method: "POST",
      headers: {
        ...(this.apiKey ? { authorization: `Bearer ${this.apiKey}` } : {}),
        "content-type": "application/json",
        "x-idempotency-key": idempotencyKey,
        "x-interai-client": this.clientName
      },
      body: JSON.stringify(request)
    })

    const text = await response.text()
    let body: unknown
    try {
      body = text ? JSON.parse(text) : null
    } catch {
      body = { error: "invalid_json_response", raw: text.slice(0, 500) }
    }
    if (!response.ok) {
      throw new Error(`InterAI verify failed: ${response.status} ${JSON.stringify(body)}`)
    }
    return body as VerifyResponse
  }
}
