export type PaymentStatus = "quoted" | "paid" | "consumed" | "expired"

export type PaymentRecord = {
  ref: string
  amount: string
  pay_to: string
  created_at: number
  expires_at: number
  status: PaymentStatus
  tx_hash?: string
}

export type AccountRecord = {
  id: string
  name?: string
  status: "active" | "disabled"
  created_at: number
}

export type TopupRecord = {
  id: string
  account_id: string
  amount: string
  pay_to: string
  status: string
  tx_hash: string | null
  created_at: number
  expires_at: number
}

export type TrustReceiptRecord = {
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
  dominant_negatives: string[]
  dominant_positives: string[]
  signature: string
  signature_alg: string
}

export type DiscoveryEventRecord = {
  id: string
  event_type: string
  path: string
  method: string
  client_hint: string | null
  user_agent: string | null
  created_at: number
}
