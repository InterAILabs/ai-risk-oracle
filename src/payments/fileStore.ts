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
}

const DATA_DIR = path.join(process.cwd(), "data")
const FILE = path.join(DATA_DIR, "payments.json")

let store: Record<string, PaymentRecord> = {}

function ensureStore() {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true })

  if (!fs.existsSync(FILE)) {
    fs.writeFileSync(FILE, JSON.stringify({}))
  }

  const raw = fs.readFileSync(FILE, "utf8")
  store = raw ? JSON.parse(raw) : {}
}

function flush() {
  fs.writeFileSync(FILE, JSON.stringify(store, null, 2))
}

ensureStore()

export function createQuote(
  ref: string,
  amount: string,
  pay_to: string,
  ttl_ms: number
) {
  const now = Date.now()

  store[ref] = {
    ref,
    amount,
    pay_to,
    created_at: now,
    expires_at: now + ttl_ms,
    status: "quoted"
  }

  flush()
}

export function markPaid(ref: string) {
  const rec = store[ref]
  if (!rec) return false
  rec.status = "paid"
  flush()
  return true
}

export function consume(ref: string) {
  const rec = store[ref]
  if (!rec) return false
  if (rec.status !== "paid") return false

  rec.status = "consumed"
  flush()
  return true
}

export function getPayment(ref: string) {
  const rec = store[ref]
  if (!rec) return null

  if (Date.now() > rec.expires_at && rec.status === "quoted") {
    rec.status = "expired"
    flush()
  }

  return rec
}