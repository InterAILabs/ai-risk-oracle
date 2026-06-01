export type RiskLevel = "low" | "medium" | "high"
export type GatewayAction = "allow" | "review_required" | "block"
export type LegacyAction = "accept" | "review" | "reject"
export type RecommendedAction = GatewayAction | LegacyAction
export type RequestContract = "autonomous_execution" | "legacy_verify"

export type PolicyViolation = {
  code: string
  message: string
  severity: GatewayAction
}

export type VerifyRequest = {
  use_case: string
  action: Record<string, unknown>
  context?: Record<string, unknown>
  policy?: Record<string, unknown>
}

export type VerifyResponse = {
  decision_id: string
  request_contract: RequestContract
  score: number
  risk_level: RiskLevel
  signals: Record<string, unknown>
  recommended_action: RecommendedAction
  policy_result?: GatewayAction
  policy_violations?: PolicyViolation[]
  trust_receipt_id: string
  trust_receipt?: Record<string, unknown>
}

export type InterAIClientOptions = {
  baseUrl: string
  apiKey?: string
}

export class InterAIRiskOracleClient {
  readonly baseUrl: string
  readonly apiKey?: string

  constructor(options: InterAIClientOptions) {
    this.baseUrl = options.baseUrl.replace(/\/$/, "")
    this.apiKey = options.apiKey
  }

  async verify(request: VerifyRequest): Promise<VerifyResponse> {
    const response = await fetch(`${this.baseUrl}/verify`, {
      method: "POST",
      headers: {
        ...(this.apiKey ? { authorization: `Bearer ${this.apiKey}` } : {}),
        "content-type": "application/json"
      },
      body: JSON.stringify(request)
    })

    const body = await response.json()
    if (!response.ok) {
      throw new Error(`InterAI verify failed: ${response.status} ${JSON.stringify(body)}`)
    }
    return body as VerifyResponse
  }
}
