import {
  insertTrustReceiptStmt,
  selectTrustHistoryForAccountDomainStmt,
  selectTrustReputationDomainsForAccountStmt,
  selectTrustReputationForAccountStmt,
  selectTrustReceiptByIdStmt,
  selectTrustReceiptsForAccountStmt
} from "./statements.js"
import { mapTrustReceiptInsert, normalizeTrustReceiptRecord } from "./mappers.js"
import type { TrustReceiptRecord } from "./types.js"

export type TrustHistoryProfile = {
  available: boolean
  scope: "account_domain"
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
}

export type TrustReputationProfile = {
  available: boolean
  account_id: string
  sample_size: number
  reputation_score: number | null
  average_trust_score: number | null
  high_risk_count: number
  medium_risk_count: number
  low_risk_count: number
  high_risk_rate: number | null
  first_receipt_at: string | null
  latest_receipt_at: string | null
  domains: Array<{
    domain: string
    sample_size: number
    average_trust_score: number | null
    reputation_score: number | null
    high_risk_count: number
    medium_risk_count: number
    low_risk_count: number
    high_risk_rate: number | null
    latest_receipt_at: string | null
  }>
}

function roundNullableScore(value: number | null | undefined) {
  return value == null ? null : Number(Number(value).toFixed(4))
}

function computeReputationScore(params: {
  averageTrustScore: number | null
  highRiskRate: number | null
}) {
  if (params.averageTrustScore == null) return null
  const penalty = (params.highRiskRate ?? 0) * 0.25
  return Number(Math.max(0, Math.min(1, params.averageTrustScore - penalty)).toFixed(4))
}

export function createTrustReceipt(record: TrustReceiptRecord) {
  insertTrustReceiptStmt.run(mapTrustReceiptInsert(record))
  return record
}

export function listTrustReceipts(params: {
  accountId: string
  limit?: number
}) {
  const rows = selectTrustReceiptsForAccountStmt.all(
    params.accountId,
    Math.max(1, Math.min(params.limit ?? 50, 200))
  ) as Array<{
    receipt_id: string
    issued_at: string
    oracle_version: string
    signals_version: string
    request_hash: string
    domain: string
    account_id: string | null
    usage_id: string | null
    payment_ref: string | null
    trust_score: number
    risk_level: "low" | "medium" | "high"
    confidence_band: "low" | "medium" | "high"
    verdict: "accept" | "review" | "reject"
    confidence: number
    risk_factors_json: string
    claims_checked: number
    claims_supported: number
    claims_uncertain: number
    dominant_negatives_json: string
    dominant_positives_json: string
    signature: string
    signature_alg: string
  }>

  return rows.map((row) => normalizeTrustReceiptRecord(row)!)
}

export function getTrustReceiptById(receiptId: string) {
  const row = selectTrustReceiptByIdStmt.get(receiptId) as
    | {
        receipt_id: string
        issued_at: string
        oracle_version: string
        signals_version: string
        request_hash: string
        domain: string
        account_id: string | null
        usage_id: string | null
        payment_ref: string | null
        trust_score: number
        risk_level: "low" | "medium" | "high"
        confidence_band: "low" | "medium" | "high"
        verdict: "accept" | "review" | "reject"
        confidence: number
        risk_factors_json: string
        claims_checked: number
        claims_supported: number
        claims_uncertain: number
        dominant_negatives_json: string
        dominant_positives_json: string
        signature: string
        signature_alg: string
      }
    | undefined

  return normalizeTrustReceiptRecord(row)
}

export function getTrustHistoryForAccountDomain(params: {
  accountId: string
  domain: string
}): TrustHistoryProfile {
  const row = selectTrustHistoryForAccountDomainStmt.get(
    params.accountId,
    params.domain
  ) as
    | {
        sample_size: number
        average_trust_score: number | null
        min_trust_score: number | null
        max_trust_score: number | null
        high_risk_count: number | null
        medium_risk_count: number | null
        low_risk_count: number | null
        latest_receipt_at: string | null
      }
    | undefined

  const sampleSize = Number(row?.sample_size ?? 0)
  const highRiskCount = Number(row?.high_risk_count ?? 0)

  return {
    available: sampleSize > 0,
    scope: "account_domain",
    domain: params.domain,
    sample_size: sampleSize,
    average_trust_score:
      row?.average_trust_score == null
        ? null
        : Number(Number(row.average_trust_score).toFixed(4)),
    min_trust_score:
      row?.min_trust_score == null
        ? null
        : Number(Number(row.min_trust_score).toFixed(4)),
    max_trust_score:
      row?.max_trust_score == null
        ? null
        : Number(Number(row.max_trust_score).toFixed(4)),
    high_risk_count: highRiskCount,
    medium_risk_count: Number(row?.medium_risk_count ?? 0),
    low_risk_count: Number(row?.low_risk_count ?? 0),
    high_risk_rate:
      sampleSize > 0
        ? Number((highRiskCount / sampleSize).toFixed(4))
        : null,
    latest_receipt_at: row?.latest_receipt_at ?? null
  }
}

export function getTrustReputationForAccount(params: {
  accountId: string
  domainsLimit?: number
}): TrustReputationProfile {
  const row = selectTrustReputationForAccountStmt.get(params.accountId) as
    | {
        sample_size: number
        average_trust_score: number | null
        high_risk_count: number | null
        medium_risk_count: number | null
        low_risk_count: number | null
        first_receipt_at: string | null
        latest_receipt_at: string | null
      }
    | undefined

  const sampleSize = Number(row?.sample_size ?? 0)
  const highRiskCount = Number(row?.high_risk_count ?? 0)
  const averageTrustScore = roundNullableScore(row?.average_trust_score)
  const highRiskRate =
    sampleSize > 0 ? Number((highRiskCount / sampleSize).toFixed(4)) : null

  const domainRows = selectTrustReputationDomainsForAccountStmt.all(
    params.accountId,
    Math.max(1, Math.min(params.domainsLimit ?? 20, 100))
  ) as Array<{
    domain: string
    sample_size: number
    average_trust_score: number | null
    high_risk_count: number | null
    medium_risk_count: number | null
    low_risk_count: number | null
    latest_receipt_at: string | null
  }>

  return {
    available: sampleSize > 0,
    account_id: params.accountId,
    sample_size: sampleSize,
    reputation_score: computeReputationScore({
      averageTrustScore,
      highRiskRate
    }),
    average_trust_score: averageTrustScore,
    high_risk_count: highRiskCount,
    medium_risk_count: Number(row?.medium_risk_count ?? 0),
    low_risk_count: Number(row?.low_risk_count ?? 0),
    high_risk_rate: highRiskRate,
    first_receipt_at: row?.first_receipt_at ?? null,
    latest_receipt_at: row?.latest_receipt_at ?? null,
    domains: domainRows.map((domainRow) => {
      const domainSampleSize = Number(domainRow.sample_size ?? 0)
      const domainHighRiskCount = Number(domainRow.high_risk_count ?? 0)
      const domainAverageTrustScore = roundNullableScore(
        domainRow.average_trust_score
      )
      const domainHighRiskRate =
        domainSampleSize > 0
          ? Number((domainHighRiskCount / domainSampleSize).toFixed(4))
          : null

      return {
        domain: String(domainRow.domain),
        sample_size: domainSampleSize,
        average_trust_score: domainAverageTrustScore,
        reputation_score: computeReputationScore({
          averageTrustScore: domainAverageTrustScore,
          highRiskRate: domainHighRiskRate
        }),
        high_risk_count: domainHighRiskCount,
        medium_risk_count: Number(domainRow.medium_risk_count ?? 0),
        low_risk_count: Number(domainRow.low_risk_count ?? 0),
        high_risk_rate: domainHighRiskRate,
        latest_receipt_at: domainRow.latest_receipt_at ?? null
      }
    })
  }
}
