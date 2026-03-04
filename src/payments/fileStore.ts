import fs from "node:fs"
import path from "node:path"

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

const TTL_MS = 10 * 60 * 1000 // 10 min
const DATA_DIR = path.join(process.cwd(), "data")
const FILE_PATH = path.join(DATA_DIR, "payments.json")

function ensureFile() {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true })
  if (!fs.existsSync(FILE_PATH)) fs.writeFileSync(FILE_PATH, JSON.stringify({}), "utf-8")
}

function readAll(): Record<string, PaymentQuote> {
  ensureFile()
  const raw = fs.readFileSync(FILE_PATH, "utf-8")
  try {
    return JSON.parse(raw || "{}")
  } catch {
    return {}
  }
}

function writeAll(obj: Record<string, PaymentQuote>) {
  ensureFile()
  fs.writeFileSync(FILE_PATH, JSON.stringify(obj, null, 2), "utf-8")
}

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

  const all = readAll()
  all[ref] = q
  writeAll(all)
  return q
}

export function getQuote(ref: string): PaymentQuote | undefined {
  const all = readAll()
  const q = all[ref]
  if (!q) return undefined

  if (Date.now() > q.expires_at_ms && q.status !== "paid") {
    q.status = "expired"
    all[ref] = q
    writeAll(all)
  }

  return q
}

export function markPaid(ref: string): PaymentQuote | undefined {
  const all = readAll()
  const q = all[ref]
  if (!q) return undefined
  if (q.status === "expired") return q

  q.status = "paid"
  all[ref] = q
  writeAll(all)
  return q
}

export function isPaid(ref: string): boolean {
  const q = getQuote(ref)
  return !!q && q.status === "paid"
}

/**
 * Alias conveniente para el endpoint /pay/confirm.
 * Mantiene compatibilidad con el nombre que usa pay.ts.
 */
export function confirmPayment(ref: string) {
  const q = getQuote(ref)
  if (!q) {
    return { ok: false, error: "payment_not_found", ref }
  }
  if (q.status === "expired") {
    return { ok: false, error: "payment_expired", ref, payment: q }
  }

  const paid = markPaid(ref)!
  return { ok: true, payment: paid }
}