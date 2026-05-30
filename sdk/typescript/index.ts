export type RiskLevel = "low" | "medium" | "high" | "critical"
export type RecommendedAction = "accept" | "review" | "reject"

export type VerifyRequest = {
  use_case: string
  action: Record<string, unknown>
  context?: Record<string, unknown>
  policy?: Record<string, unknown>
}

export type VerifyResponse = {
  decision_id: string
  score: number
  risk_level: RiskLevel
  signals: Array<Record<string, unknown>>
  recommended_action: RecommendedAction
  trust_receipt_id?: string
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
