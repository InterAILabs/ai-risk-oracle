import { insertTrustReceiptStmt, selectTrustReceiptByIdStmt, selectTrustReceiptsForAccountStmt } from "./statements.js"
import { mapTrustReceiptInsert, normalizeTrustReceiptRecord } from "./mappers.js"
import type { TrustReceiptRecord } from "./types.js"

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
        dominant_negatives_json: string
        dominant_positives_json: string
        signature: string
        signature_alg: string
      }
    | undefined

  return normalizeTrustReceiptRecord(row)
}
