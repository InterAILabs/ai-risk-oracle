import fs from "fs"
import path from "path"

export type PaymentStatus = "quoted" | "paid" | "consumed" | "expired"

type PaymentRecord = {
  ref: string
  amount: string
  pay_to: string
  created_at: number
  expires_at: number
  status: PaymentStatus
  tx_hash?: string
}

const DATA_DIR = path.join(process.cwd(), "data")
const FILE = path.join(DATA_DIR, "payments.json")

let store: Record<string, any> = {}

function ensureStore() {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true })
  if (!fs.existsSync(FILE)) fs.writeFileSync(FILE, JSON.stringify({}))
  const raw = fs.readFileSync(FILE, "utf8")
  store = raw ? JSON.parse(raw) : {}
  if (!store.__used_txs) store.__used_txs = {}
}

function flush() {
  fs.writeFileSync(FILE, JSON.stringify(store, null, 2))
}

ensureStore()

export function createQuote(ref: string, amount: string, pay_to: string, ttl_ms: number) {
  const now = Date.now()
  store[ref] = {
    ref,
    amount,
    pay_to,
    created_at: now,
    expires_at: now + ttl_ms,
    status: "quoted"
  } satisfies PaymentRecord
  flush()
}

export function getPayment(ref: string): PaymentRecord | null {
  const rec = store[ref] as PaymentRecord | undefined
  if (!rec) return null

  if (Date.now() > rec.expires_at && rec.status === "quoted") {
    rec.status = "expired"
    store[ref] = rec
    flush()
  }
  return rec
}

export function markPaid(ref: string, txHash?: string) {
  const rec = store[ref] as PaymentRecord | undefined
  if (!rec) return false
  rec.status = "paid"
  if (txHash) rec.tx_hash = txHash
  store[ref] = rec
  flush()
  return true
}

export function consume(ref: string) {
  const rec = store[ref] as PaymentRecord | undefined
  if (!rec) return false
  if (rec.status !== "paid") return false
  rec.status = "consumed"
  store[ref] = rec
  flush()
  return true
}

// tx dedupe (para que no reutilicen el mismo pago en múltiples refs)
export function isTxUsed(txHash: string) {
  return Boolean(store.__used_txs?.[txHash])
}

export function markTxUsed(txHash: string, ref: string) {
  if (!store.__used_txs) store.__used_txs = {}
  store.__used_txs[txHash] = { ref, used_at: Date.now() }
  flush()
}