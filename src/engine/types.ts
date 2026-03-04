export interface VerifyInput {
  prompt: string
  response: string
  domain?: string
}

export interface VerifyOutput {
  consistency_score: number
  hallucination_risk: number
  risk_level: "low" | "medium" | "high"
  recommended_action: "accept" | "review" | "reject"
  analysis: {
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
}