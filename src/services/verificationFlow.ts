import {
  createTrustReceipt,
  debitAccountForUsage
} from "../payments/fileStore.js"
import { scoreResponse } from "../engine/score.js"
import { computeSignals, type Signals } from "../lib/signals.js"
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
  trust_receipt: ReturnType<typeof buildTrustReceipt> & {
    signature: string | null
    signature_alg: string | null
    signed: boolean
  }
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
  const num = Number(amount)
  if (!Number.isFinite(num) || num <= 0) {
    throw new Error("invalid_usdc_amount")
  }
  return Math.round(num * 1_000_000)
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
    balance_usdc: (params.balanceMicrousdc / 1_000_000).toFixed(6),
    shortfall_microusdc: shortfallMicrousdc,
    shortfall_usdc: (shortfallMicrousdc / 1_000_000).toFixed(6),
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
  signals: Signals
  trust_score: number
  risk_level: "low" | "medium" | "high"
  confidence_band: ConfidenceBand
}) {
  const baseReceipt = buildTrustReceipt({
    prompt: params.verification.prompt,
    response: params.verification.response,
    domain: params.verification.domain,
    signals: params.signals,
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

export function runVerification(
  input: VerificationInput
): VerificationComputation {
  const result = scoreResponse({
    prompt: input.prompt,
    response: input.response,
    domain: input.domain
  })

  const signals = computeSignals(input.prompt, input.response)
  const trust = computeTrust(signals)
  const confidence_band = computeConfidenceBand(signals)
  const trust_receipt = persistReceipt({
    verification: input,
    signals,
    trust_score: trust.trust_score,
    risk_level: trust.risk_level,
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
    trust_receipt
  }
}

export function runBatchVerification(
  items: BatchVerificationInput[],
  owner: Omit<VerificationInput, "prompt" | "response" | "domain">
) {
  const results = items.map((item) =>
    runVerification({
      prompt: item.prompt ?? "",
      response: item.response ?? "",
      domain: item.domain ?? "general",
      accountId: owner.accountId,
      usageId: owner.usageId,
      paymentRef: owner.paymentRef
    })
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
