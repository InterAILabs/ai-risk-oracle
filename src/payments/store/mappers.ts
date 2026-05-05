import type {
  AccountRecord,
  PaymentRecord,
  TopupRecord,
  TrustReceiptRecord
} from "./types.js"

export type { AccountRecord, PaymentRecord, TopupRecord } from "./types.js"

export function normalizePaymentRecord(row: any): PaymentRecord | null {
  if (!row) return null

  return {
    ref: String(row.ref),
    amount: String(row.amount),
    pay_to: String(row.pay_to),
    created_at: Number(row.created_at),
    expires_at: Number(row.expires_at),
    status: row.status as PaymentRecord["status"],
    tx_hash: row.tx_hash ? String(row.tx_hash) : undefined
  }
}

export function normalizeAccountRecord(row: any): AccountRecord | null {
  if (!row) return null

  return {
    id: String(row.id),
    name: row.name ? String(row.name) : undefined,
    status: row.status as AccountRecord["status"],
    created_at: Number(row.created_at)
  }
}

export function normalizeTopupRecord(row: any): TopupRecord | null {
  if (!row) return null

  return {
    id: String(row.id),
    account_id: String(row.account_id),
    amount: String(row.amount),
    pay_to: String(row.pay_to),
    status: String(row.status),
    tx_hash: row.tx_hash ? String(row.tx_hash) : null,
    created_at: Number(row.created_at),
    expires_at: Number(row.expires_at)
  }
}

export function normalizeBalanceRecord(
  row:
    | { account_id: string; balance_microusdc: number; updated_at: number }
    | undefined
) {
  if (!row) return null

  return {
    account_id: String(row.account_id),
    balance_microusdc: Number(row.balance_microusdc),
    balance_usdc: (Number(row.balance_microusdc) / 1_000_000).toFixed(6),
    updated_at: Number(row.updated_at)
  }
}

export function normalizeTrustReceiptRecord(
  row:
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
        dominant_negatives_json: string
        dominant_positives_json: string
        signature: string
        signature_alg: string
      }
    | undefined
) {
  if (!row) return null

  return {
    receipt_id: String(row.receipt_id),
    issued_at: String(row.issued_at),
    oracle_version: String(row.oracle_version),
    signals_version: String(row.signals_version),
    request_hash: String(row.request_hash),
    domain: String(row.domain),
    account_id: row.account_id ? String(row.account_id) : null,
    usage_id: row.usage_id ? String(row.usage_id) : null,
    payment_ref: row.payment_ref ? String(row.payment_ref) : null,
    trust_score: Number(row.trust_score),
    risk_level: row.risk_level,
    confidence_band: row.confidence_band,
    dominant_negatives: JSON.parse(row.dominant_negatives_json || "[]"),
    dominant_positives: JSON.parse(row.dominant_positives_json || "[]"),
    signature: row.signature ? String(row.signature) : null,
    signature_alg: row.signature ? String(row.signature_alg) : null,
    signed: Boolean(row.signature)
  }
}

export function mapTrustReceiptInsert(record: TrustReceiptRecord) {
  return {
    receipt_id: record.receipt_id,
    issued_at: record.issued_at,
    oracle_version: record.oracle_version,
    signals_version: record.signals_version,
    request_hash: record.request_hash,
    domain: record.domain,
    account_id: record.account_id,
    usage_id: record.usage_id,
    payment_ref: record.payment_ref,
    trust_score: record.trust_score,
    risk_level: record.risk_level,
    confidence_band: record.confidence_band,
    dominant_negatives_json: JSON.stringify(record.dominant_negatives),
    dominant_positives_json: JSON.stringify(record.dominant_positives),
    signature: record.signature,
    signature_alg: record.signature_alg
  }
}
