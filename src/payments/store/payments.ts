import { db } from "./db.js"
import { normalizePaymentRecord } from "./mappers.js"
import {
  countApiKeysStmt,
  countUsedTxsStmt,
  consumeStmt,
  expireAllQuotedStmt,
  expireQuotedIfNeededStmt,
  insertUsedTxStmt,
  insertQuoteStmt,
  ledgerCountStmt,
  markPaidStmt,
  selectPaymentStmt,
  selectUsedTxStmt,
  statsStmt,
  usageCountStmt
} from "./statements.js"
import type { PaymentStatus } from "./types.js"

function expireIfNeeded(ref: string) {
  expireQuotedIfNeededStmt.run(ref, Date.now())
}

export function createQuote(ref: string, amount: string, pay_to: string, ttl_ms: number) {
  const now = Date.now()

  insertQuoteStmt.run({
    ref,
    amount,
    pay_to,
    created_at: now,
    expires_at: now + ttl_ms,
    status: "quoted"
  })
}

export function getPayment(ref: string) {
  expireIfNeeded(ref)
  return normalizePaymentRecord(selectPaymentStmt.get(ref))
}

export function markPaid(ref: string, txHash?: string) {
  const result = markPaidStmt.run(txHash ?? null, ref, Date.now())
  return result.changes > 0
}

export function consume(ref: string) {
  const result = consumeStmt.run(ref)
  return result.changes > 0
}

export function isTxUsed(txHash: string) {
  return Boolean(selectUsedTxStmt.get(txHash))
}

export function markTxUsed(txHash: string, ref: string) {
  try {
    insertUsedTxStmt.run(txHash, ref, Date.now())
    return true
  } catch (error: unknown) {
    if (String(error instanceof Error ? error.message : error ?? "").includes("UNIQUE constraint failed")) {
      return false
    }
    throw error
  }
}

export function confirmOnchainPayment(ref: string, txHash: string) {
  return db.transaction(() => {
    expireIfNeeded(ref)

    const payment = normalizePaymentRecord(selectPaymentStmt.get(ref))
    if (!payment) {
      return { ok: false as const, error: "invalid_payment_reference" }
    }

    if (payment.status === "expired") {
      return { ok: false as const, error: "payment_expired" }
    }

    if (payment.status === "consumed") {
      return { ok: false as const, error: "payment_already_used" }
    }

    if (payment.status === "paid") {
      if (payment.tx_hash === txHash) {
        return { ok: true as const, payment }
      }
      return { ok: false as const, error: "payment_already_confirmed_with_other_tx" }
    }

    const alreadyUsed = selectUsedTxStmt.get(txHash) as { ref: string } | undefined
    if (alreadyUsed && String(alreadyUsed.ref) !== ref) {
      return { ok: false as const, error: "payment_tx_already_used" }
    }

    if (!alreadyUsed) {
      insertUsedTxStmt.run(txHash, ref, Date.now())
    }

    const update = markPaidStmt.run(txHash, ref, Date.now())

    if (update.changes === 0) {
      const fresh = normalizePaymentRecord(selectPaymentStmt.get(ref))

      if (!fresh) {
        return { ok: false as const, error: "invalid_payment_reference" }
      }

      if (fresh.status === "expired") {
        return { ok: false as const, error: "payment_expired" }
      }

      return { ok: false as const, error: "payment_not_confirmable" }
    }

    const updated = normalizePaymentRecord(selectPaymentStmt.get(ref))
    return { ok: true as const, payment: updated! }
  })()
}

export function getPaymentStats() {
  expireAllQuotedStmt.run(Date.now())

  let quoted = 0
  let paid = 0
  let consumed = 0
  let expired = 0

  const rows = statsStmt.all() as Array<{ status: PaymentStatus; count: number }>

  for (const row of rows) {
    if (row.status === "quoted") quoted = Number(row.count)
    else if (row.status === "paid") paid = Number(row.count)
    else if (row.status === "consumed") consumed = Number(row.count)
    else if (row.status === "expired") expired = Number(row.count)
  }

  const usedTxs = countUsedTxsStmt.get() as { count: number }
  const ledgerCount = ledgerCountStmt.get() as { count: number }
  const usageCount = usageCountStmt.get() as { count: number }
  const apiKeysCount = countApiKeysStmt.get() as { count: number }

  return {
    quoted,
    paid,
    consumed,
    expired,
    used_txs: Number(usedTxs?.count ?? 0),
    ledger_entries: Number(ledgerCount?.count ?? 0),
    usage_events: Number(usageCount?.count ?? 0),
    api_keys: Number(apiKeysCount?.count ?? 0),
    total_payment_references: quoted + paid + consumed + expired
  }
}
