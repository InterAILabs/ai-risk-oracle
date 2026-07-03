export type AgentAction = {
  type: string
  name: string
  description: string
  external_side_effect: boolean
  irreversible: boolean
  amount_usd?: number
  currency?: string
  metadata?: Record<string, unknown>
}

export type VerifyRequest = {
  use_case: string
  action: AgentAction
  context: {
    agent_id: string
    environment: "sandbox" | "staging" | "production"
    user_confirmation: boolean
    counterparty_id?: string
  }
  policy: {
    max_risk_level: "low" | "medium" | "high"
    require_trust_receipt: boolean
    amount_usd_limit?: number
    blocked_action_types?: string[]
    require_human_review_above?: number
  }
}

export type VerifyResponse = {
  recommended_action?: "allow" | "review_required" | "block" | string
  risk_level?: "low" | "medium" | "high" | string
  policy_result?: "allow" | "review_required" | "block" | string
  trust_receipt_id?: string
  trust_receipt?: {
    receipt_id?: string
  }
  [key: string]: unknown
}

export type InterAIClientOptions = {
  apiKey?: string
  baseUrl?: string
  agentId?: string
  environment?: "sandbox" | "staging" | "production"
}

export type ExecutionDecision =
  | {
      status: "executed"
      recommended_action: "allow"
      risk_level: string | null
      policy_result: string | null
      trust_receipt_id: string | null
      result: unknown
      verification: VerifyResponse
    }
  | {
      status: "review_required"
      recommended_action: "review_required"
      risk_level: string | null
      policy_result: string | null
      trust_receipt_id: string | null
      review_reason: string
      verification: VerifyResponse
    }
  | {
      status: "blocked"
      recommended_action: "block"
      risk_level: string | null
      policy_result: string | null
      trust_receipt_id: string | null
      block_reason: string
      verification: VerifyResponse
    }

export type ActionExecutor<T = unknown> = (action: AgentAction) => Promise<T>

function clientOptions(options: InterAIClientOptions = {}) {
  return {
    apiKey: options.apiKey ?? process.env.INTERAI_API_KEY,
    baseUrl:
      options.baseUrl ??
      process.env.INTERAI_BASE_URL ??
      "https://ai-risk-oracle.fly.dev",
    agentId: options.agentId ?? "example_agent_middleware",
    environment: options.environment ?? "sandbox"
  }
}

function receiptIdFrom(response: VerifyResponse) {
  return response.trust_receipt_id ?? response.trust_receipt?.receipt_id ?? null
}

function assertValidVerifyResponse(value: unknown): asserts value is VerifyResponse {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error("Malformed InterAI response: expected JSON object")
  }

  const action = (value as VerifyResponse).recommended_action
  if (action !== "allow" && action !== "review_required" && action !== "block") {
    throw new Error("Malformed InterAI response: missing recommended_action")
  }
}

export async function verifyBeforeExecution(
  action: AgentAction,
  options: InterAIClientOptions = {}
): Promise<VerifyResponse> {
  const config = clientOptions(options)
  if (!config.apiKey) {
    throw new Error("Missing INTERAI_API_KEY")
  }

  const request: VerifyRequest = {
    use_case: "agent-before-tool-execution",
    action,
    context: {
      agent_id: config.agentId,
      environment: config.environment,
      user_confirmation: false
    },
    policy: {
      max_risk_level: "medium",
      require_trust_receipt: true,
      amount_usd_limit: 500,
      blocked_action_types: ["irreversible_transfer"],
      require_human_review_above: 0.75
    }
  }

  let response: Response
  try {
    response = await fetch(`${config.baseUrl.replace(/\/+$/, "")}/verify`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${config.apiKey}`,
        "x-idempotency-key": `agent-middleware-${Date.now()}`
      },
      body: JSON.stringify(request)
    })
  } catch (error) {
    throw new Error(
      `Network failure calling InterAI: ${
        error instanceof Error ? error.message : String(error)
      }`
    )
  }

  const text = await response.text()
  let body: unknown
  try {
    body = text ? JSON.parse(text) : {}
  } catch {
    throw new Error(`Malformed InterAI response: non-JSON HTTP ${response.status}`)
  }

  if (!response.ok) {
    throw new Error(
      `InterAI /verify failed: HTTP ${response.status} ${JSON.stringify(body).slice(
        0,
        300
      )}`
    )
  }

  assertValidVerifyResponse(body)
  return body
}

export async function executeWithInterAIGate<T>(
  action: AgentAction,
  executor: ActionExecutor<T>,
  options: InterAIClientOptions = {}
): Promise<ExecutionDecision> {
  const verification = await verifyBeforeExecution(action, options)
  const recommendedAction = verification.recommended_action
  const base = {
    risk_level: verification.risk_level ?? null,
    policy_result: verification.policy_result ?? null,
    trust_receipt_id: receiptIdFrom(verification),
    verification
  }

  console.log("InterAI decision", {
    recommended_action: recommendedAction,
    risk_level: base.risk_level,
    policy_result: base.policy_result,
    trust_receipt_id: base.trust_receipt_id
  })

  if (recommendedAction === "allow") {
    const result = await executor(action)
    return {
      status: "executed",
      recommended_action: "allow",
      ...base,
      result
    }
  }

  if (recommendedAction === "review_required") {
    return {
      status: "review_required",
      recommended_action: "review_required",
      ...base,
      review_reason: "InterAI requires supervisor or policy review before execution"
    }
  }

  return {
    status: "blocked",
    recommended_action: "block",
    ...base,
    block_reason: "InterAI blocked this action before execution"
  }
}
