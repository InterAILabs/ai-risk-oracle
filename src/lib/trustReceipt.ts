import { createHash, randomUUID } from "crypto"
import type { Signals } from "./signals.js"

export type ConfidenceBand = "low" | "medium" | "high"

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
  oracleVersion: string
  signalsVersion: string
}) {
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
    decision_basis: {
      dominant_negatives: pickDominantNegatives(input.signals),
      dominant_positives: pickDominantPositives(input.signals)
    }
  }
}