import {
  insertIdempotencyRecordStmt,
  selectIdempotencyRecordStmt
} from "./statements.js"

export type IdempotencyRecord = {
  account_id: string
  service: string
  idempotency_key: string
  request_hash: string
  response: unknown
  receipt_ids: string[]
  cost_microusdc: number
  created_at: number
}

function normalizeRecord(row: any): IdempotencyRecord | null {
  if (!row) return null

  return {
    account_id: String(row.account_id),
    service: String(row.service),
    idempotency_key: String(row.idempotency_key),
    request_hash: String(row.request_hash),
    response: JSON.parse(String(row.response_json)),
    receipt_ids: JSON.parse(String(row.receipt_ids_json || "[]")),
    cost_microusdc: Number(row.cost_microusdc),
    created_at: Number(row.created_at)
  }
}

export function getIdempotencyRecord(params: {
  accountId: string
  service: string
  idempotencyKey: string
}) {
  return normalizeRecord(
    selectIdempotencyRecordStmt.get(
      params.accountId,
      params.service,
      params.idempotencyKey
    )
  )
}

export function createIdempotencyRecord(params: {
  accountId: string
  service: string
  idempotencyKey: string
  requestHash: string
  response: unknown
  receiptIds?: string[]
  costMicrousdc: number
}) {
  insertIdempotencyRecordStmt.run({
    account_id: params.accountId,
    service: params.service,
    idempotency_key: params.idempotencyKey,
    request_hash: params.requestHash,
    response_json: JSON.stringify(params.response),
    receipt_ids_json: JSON.stringify(params.receiptIds ?? []),
    cost_microusdc: params.costMicrousdc,
    created_at: Date.now()
  })
}
