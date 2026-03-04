// src/payments/memory.ts
export type PaymentStatus = "quoted" | "paid" | "expired"

export interface PaymentQuote {
  ref: string
  amount: string
  currency: "USDC"
  chain: "base"
  pay_to: string
  status: PaymentStatus
  created_at_ms: number
  expires_at_ms: number
}

const store = new Map<string, PaymentQuote>()

const TTL_MS = 10 * 60 * 1000 // 10 min

export function createQuote(ref: string, amount: string, pay_to: string): PaymentQuote {
  const now = Date.now()
  const q: PaymentQuote = {
    ref,
    amount,
    currency: "USDC",
    chain: "base",
    pay_to,
    status: "quoted",
    created_at_ms: now,
    expires_at_ms: now + TTL_MS
  }
  store.set(ref, q)
  return q
}

export function getQuote(ref: string): PaymentQuote | undefined {
  const q = store.get(ref)
  if (!q) return undefined
  if (Date.now() > q.expires_at_ms) {
    q.status = "expired"
    store.set(ref, q)
  }
  return q
}

export function markPaid(ref: string): PaymentQuote | undefined {
  const q = getQuote(ref)
  if (!q) return undefined
  if (q.status === "expired") return q
  q.status = "paid"
  store.set(ref, q)
  return q
}

export function isPaid(ref: string): boolean {
  const q = getQuote(ref)
  return !!q && q.status === "paid"
}