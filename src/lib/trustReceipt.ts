import { createHash, randomUUID } from "crypto"
import type { Signals } from "./signals.js"

export type ConfidenceBand = "low" | "medium" | "high"
export type TrustVerdict = "accept" | "review" | "reject"

export function computeConfidenceBand(signals: Signals): ConfidenceBand {
  const values = Object.values(signals)
  const mean = values.reduce((acc, n) => acc + n, 0) / values.length
  const variance =
    values.reduce((acc, n) => acc + Math.pow(n - mean, 2), 0) / values.length

  if (variance < 0.015) return "high"
  if (variance < 0.05) return "medium"
  return "low"
}

function pickDominantPositives(signals: Signals) {
  return Object.entries(signals)
    .filter(([key]) => key === "semantic_relevance" || key === "numeric_consistency")
    .sort((a, b) => b[1] - a[1])
    .filter(([, value]) => value >= 0.6)
    .map(([key]) => key)
    .slice(0, 3)
}

function pickDominantNegatives(signals: Signals) {
  return Object.entries(signals)
    .filter(
      ([key]) =>
        key === "contradiction_risk" ||
        key === "unsupported_specificity" ||
        key === "overconfidence"
    )
    .sort((a, b) => b[1] - a[1])
    .filter(([, value]) => value >= 0.5)
    .map(([key]) => key)
    .slice(0, 3)
}

function pickRiskFactors(input: {
  signals: Signals
  analysis: {
    contradictions_detected?: boolean
    numerical_conflicts?: boolean
    absolute_claims?: number
  }
}) {
  const factors: string[] = []

  if (
    input.analysis.contradictions_detected ||
    input.signals.contradiction_risk >= 0.5
  ) {
    factors.push("possible_contradiction")
  }

  if (input.analysis.numerical_conflicts || input.signals.numeric_consistency < 0.65) {
    factors.push("numeric_claim_risk")
  }

  if (input.signals.unsupported_specificity >= 0.5) {
    factors.push("unsupported_specificity")
  }

  if (input.signals.overconfidence >= 0.5) {
    factors.push("overconfident_language")
  }

  if (input.signals.semantic_relevance < 0.55) {
    factors.push("weak_prompt_response_alignment")
  }

  return factors
}

function estimateClaimSummary(input: {
  signals: Signals
  analysis: {
    contradictions_detected?: boolean
    numerical_conflicts?: boolean
    absolute_claims?: number
  }
}) {
  const explicitClaims = Number(input.analysis.absolute_claims ?? 0)
  const checked = Math.max(
    1,
    explicitClaims +
      (input.analysis.numerical_conflicts ? 1 : 0) +
      (input.analysis.contradictions_detected ? 1 : 0)
  )
  const uncertaintyRate = Math.max(
    input.signals.unsupported_specificity,
    input.signals.contradiction_risk,
    1 - input.signals.numeric_consistency
  )
  const uncertain = Math.min(checked, Math.round(checked * uncertaintyRate))

  return {
    claims_checked: checked,
    claims_supported: Math.max(0, checked - uncertain),
    claims_uncertain: uncertain
  }
}

export function buildRequestHash(input: {
  prompt: string
  response: string
  domain: string
}) {
  return createHash("sha256")
    .update(JSON.stringify(input))
    .digest("hex")
}

export function buildTrustReceipt(input: {
  prompt: string
  response: string
  domain: string
  signals: Signals
  analysis: {
    contradictions_detected?: boolean
    numerical_conflicts?: boolean
    absolute_claims?: number
  }
  trustScore: number
  riskLevel: "low" | "medium" | "high"
  recommendedAction: TrustVerdict
  confidenceBand: ConfidenceBand
  oracleVersion: string
  signalsVersion: string
}) {
  const claimSummary = estimateClaimSummary({
    signals: input.signals,
    analysis: input.analysis
  })

  return {
    receipt_id: randomUUID(),
    issued_at: new Date().toISOString(),
    oracle_version: input.oracleVersion,
    signals_version: input.signalsVersion,
    request_hash: buildRequestHash({
      prompt: input.prompt,
      response: input.response,
      domain: input.domain
    }),
    verdict: input.recommendedAction,
    confidence: Number(input.trustScore.toFixed(4)),
    risk_level: input.riskLevel,
    confidence_band: input.confidenceBand,
    risk_factors: pickRiskFactors({
      signals: input.signals,
      analysis: input.analysis
    }),
    ...claimSummary,
    decision_basis: {
      dominant_negatives: pickDominantNegatives(input.signals),
      dominant_positives: pickDominantPositives(input.signals)
    }
  }
}
