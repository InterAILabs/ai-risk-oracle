import {
  createTrustReceipt,
  debitAccountForUsage,
  getTrustHistoryForAccountDomain
} from "../payments/fileStore.js"
import { scoreResponse } from "../engine/score.js"
import type { VerificationMode } from "../config/pricing.js"
import { computeSignals, type Signals } from "../lib/signals.js"
import { runSemanticJudge, type SemanticJudgeResult } from "../lib/semanticJudge.js"
import { computeTrust } from "../lib/trust.js"
import {
  buildTrustReceipt,
  computeConfidenceBand,
  type ConfidenceBand
} from "../lib/trustReceipt.js"
import {
  isReceiptSigningEnabled,
  RECEIPT_SIGNATURE_ALG,
  signReceipt
} from "../lib/signing.js"
import {
  microusdcToUsdcString,
  usdcDecimalToMicrousdc
} from "../lib/money.js"

export const ENGINE_VERSION = process.env.ORACLE_ENGINE_VERSION || "0.0.1"
export const ORACLE_SIGNALS_VERSION = "signals-v1"
export const TRUST_SIGNING_ENABLED = isReceiptSigningEnabled()

export type VerificationInput = {
  prompt: string
  response: string
  domain: string
  accountId: string | null
  usageId: string | null
  paymentRef: string | null
  mode?: VerificationMode
}

export type BatchVerificationInput = {
  prompt: string
  response: string
  domain?: string
}

export type VerificationComputation = {
  result: ReturnType<typeof scoreResponse>
  signals: Signals
  trust_score: number
  risk_level: "low" | "medium" | "high"
  trust_recommended_action: "accept" | "review" | "reject"
  confidence_band: ConfidenceBand
  verification_mode: VerificationMode
  semantic_judge: SemanticJudgeResult | null
  historical_context: HistoricalTrustContext
  trust_receipt: ReturnType<typeof buildTrustReceipt> & {
    signature: string | null
    signature_alg: string | null
    signed: boolean
  }
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

function normalizeRecommendedAction(
  value: string
): "accept" | "review" | "reject" {
  if (value === "accept" || value === "review" || value === "reject") {
    return value
  }
  return "review"
}

export function usdcAmountToMicrousdc(amount: string) {
  return usdcDecimalToMicrousdc(amount)
}

export function chargeAndRecordUsage(params: {
  usageId: string
  accountId: string
  service: string
  costUsdc: string
  reference?: string
}) {
  return debitAccountForUsage({
    ledgerId: crypto.randomUUID(),
    usageId: params.usageId,
    accountId: params.accountId,
    service: params.service,
    costMicrousdc: usdcAmountToMicrousdc(params.costUsdc),
    reference: params.reference
  })
}

export function buildInsufficientBalanceDetails(params: {
  service: string
  costMicrousdc: number
  costUsdc: string
  balanceMicrousdc: number
  batchSize?: number
  includeDevCreditUrl?: boolean
}) {
  const shortfallMicrousdc = Math.max(
    params.costMicrousdc - params.balanceMicrousdc,
    0
  )
  const recommendedTopupUsdc = String(
    process.env.DEFAULT_RECOMMENDED_TOPUP_USDC || "0.01"
  )

  return {
    error: "insufficient_balance",
    service: params.service,
    ...(params.batchSize ? { batch_size: params.batchSize } : {}),
    cost_microusdc: params.costMicrousdc,
    cost_usdc: params.costUsdc,
    balance_microusdc: params.balanceMicrousdc,
    balance_usdc: microusdcToUsdcString(params.balanceMicrousdc),
    shortfall_microusdc: shortfallMicrousdc,
    shortfall_usdc: microusdcToUsdcString(shortfallMicrousdc),
    topup: {
      create_url: "/topup/create",
      ...(params.includeDevCreditUrl ? { dev_credit_url: "/topup/dev/credit" } : {}),
      receive_address: process.env.TOPUP_RECEIVE_ADDRESS || null,
      recommended_amount_usdc: recommendedTopupUsdc
    }
  }
}

export function persistReceipt(params: {
  verification: VerificationInput
  result: ReturnType<typeof scoreResponse>
  signals: Signals
  trust_score: number
  risk_level: "low" | "medium" | "high"
  recommended_action: "accept" | "review" | "reject"
  confidence_band: ConfidenceBand
}) {
  const baseReceipt = buildTrustReceipt({
    prompt: params.verification.prompt,
    response: params.verification.response,
    domain: params.verification.domain,
    signals: params.signals,
    analysis: params.result.analysis,
    trustScore: params.trust_score,
    riskLevel: params.risk_level,
    recommendedAction: params.recommended_action,
    confidenceBand: params.confidence_band,
    oracleVersion: ENGINE_VERSION,
    signalsVersion: ORACLE_SIGNALS_VERSION
  })

  const signature = signReceipt(baseReceipt)

  createTrustReceipt({
    receipt_id: baseReceipt.receipt_id,
    issued_at: baseReceipt.issued_at,
    oracle_version: baseReceipt.oracle_version,
    signals_version: baseReceipt.signals_version,
    request_hash: baseReceipt.request_hash,
    domain: params.verification.domain,
    account_id: params.verification.accountId,
    usage_id: params.verification.usageId,
    payment_ref: params.verification.paymentRef,
    trust_score: params.trust_score,
    risk_level: params.risk_level,
    confidence_band: params.confidence_band,
    verdict: baseReceipt.verdict,
    confidence: baseReceipt.confidence,
    risk_factors: baseReceipt.risk_factors,
    claims_checked: baseReceipt.claims_checked,
    claims_supported: baseReceipt.claims_supported,
    claims_uncertain: baseReceipt.claims_uncertain,
    dominant_negatives: baseReceipt.decision_basis.dominant_negatives,
    dominant_positives: baseReceipt.decision_basis.dominant_positives,
    signature: signature ?? "",
    signature_alg: signature ? RECEIPT_SIGNATURE_ALG : "none"
  })

  return {
    ...baseReceipt,
    signature,
    signature_alg: signature ? RECEIPT_SIGNATURE_ALG : null,
    signed: Boolean(signature)
  }
}

function emptyHistoricalContext(params: {
  domain: string
  reason: "account_history_unavailable" | "insufficient_history"
}): HistoricalTrustContext {
  return {
    available: false,
    scope: params.reason === "account_history_unavailable" ? "none" : "account_domain",
    domain: params.domain,
    sample_size: 0,
    average_trust_score: null,
    min_trust_score: null,
    max_trust_score: null,
    high_risk_count: 0,
    medium_risk_count: 0,
    low_risk_count: 0,
    high_risk_rate: null,
    latest_receipt_at: null,
    prior_to_current: true,
    reason: params.reason
  }
}

export function getHistoricalTrustContext(params: {
  accountId: string | null
  domain: string
}): HistoricalTrustContext {
  if (!params.accountId) {
    return emptyHistoricalContext({
      domain: params.domain,
      reason: "account_history_unavailable"
    })
  }

  const profile = getTrustHistoryForAccountDomain({
    accountId: params.accountId,
    domain: params.domain
  })

  if (!profile.available) {
    return emptyHistoricalContext({
      domain: params.domain,
      reason: "insufficient_history"
    })
  }

  return {
    ...profile,
    prior_to_current: true
  }
}

export function runVerification(
  input: VerificationInput,
  historicalContext?: HistoricalTrustContext
): VerificationComputation {
  const result = scoreResponse({
    prompt: input.prompt,
    response: input.response,
    domain: input.domain
  })

  const baseSignals = computeSignals(input.prompt, input.response)
  const semantic = input.mode === "semantic_judge"
    ? runSemanticJudge({
        prompt: input.prompt,
        response: input.response,
        domain: input.domain,
        signals: baseSignals
      })
    : null
  const signals = semantic?.signals ?? baseSignals
  const trust = computeTrust(signals)
  const confidence_band = computeConfidenceBand(signals)
  const historical_context =
    historicalContext ??
    getHistoricalTrustContext({
      accountId: input.accountId,
      domain: input.domain
    })
  const trust_receipt = persistReceipt({
    verification: input,
    result,
    signals,
    trust_score: trust.trust_score,
    risk_level: trust.risk_level,
    recommended_action: normalizeRecommendedAction(trust.recommended_action),
    confidence_band
  })

  return {
    result,
    signals,
    trust_score: trust.trust_score,
    risk_level: trust.risk_level,
    trust_recommended_action: normalizeRecommendedAction(
      trust.recommended_action
    ),
    confidence_band,
    verification_mode: input.mode ?? "fast_heuristic",
    semantic_judge: semantic?.semantic_judge ?? null,
    historical_context,
    trust_receipt
  }
}

export function runBatchVerification(
  items: BatchVerificationInput[],
  owner: Omit<VerificationInput, "prompt" | "response" | "domain">
) {
  const historicalContextsByDomain = new Map<string, HistoricalTrustContext>()
  for (const item of items) {
    const domain = item.domain ?? "general"
    if (!historicalContextsByDomain.has(domain)) {
      historicalContextsByDomain.set(
        domain,
        getHistoricalTrustContext({
          accountId: owner.accountId,
          domain
        })
      )
    }
  }

  const results = items.map((item) =>
    runVerification({
      prompt: item.prompt ?? "",
      response: item.response ?? "",
      domain: item.domain ?? "general",
      accountId: owner.accountId,
      usageId: owner.usageId,
      paymentRef: owner.paymentRef
    }, historicalContextsByDomain.get(item.domain ?? "general"))
  )

  const avgConsistency =
    results.reduce((acc, item) => acc + item.result.consistency_score, 0) /
    results.length
  const highRiskCount = results.filter((item) => item.risk_level === "high").length
  const maxLatencyMs = Math.max(
    ...results.map(
      (item) =>
        item.result.analysis.total_latency_ms ??
        item.result.analysis.engine_latency_ms ??
        0
    )
  )

  return {
    results,
    summary: {
      count: results.length,
      avg_consistency_score: Number(avgConsistency.toFixed(4)),
      high_risk_count: highRiskCount
    },
    maxLatencyMs
  }
}
