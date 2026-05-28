import { randomUUID } from "crypto"
import { db } from "./db.js"
import { normalizeBalanceRecord, normalizeTopupRecord } from "./mappers.js"
import {
  confirmTopupStmt,
  expirePendingTopupStmt,
  insertLedgerStmt,
  insertTopupStmt,
  insertUsedTopupTxStmt,
  selectBalanceStmt,
  selectTopupForAccountStmt,
  selectTopupStmt,
  selectUsedTopupTxStmt,
  updateBalanceStmt
} from "./statements.js"
import type { TopupRecord } from "./types.js"
import { usdcDecimalToMicrousdc } from "../../lib/money.js"

function getAccountBalance(accountId: string) {
  const row = selectBalanceStmt.get(accountId) as
    | { account_id: string; balance_microusdc: number; updated_at: number }
    | undefined

  return normalizeBalanceRecord(row)
}

export function markTopupTxUsed(txHash: string, topupId: string) {
  try {
    insertUsedTopupTxStmt.run(txHash, topupId, Date.now())
    return true
  } catch (error: unknown) {
    if (
      String(error instanceof Error ? error.message : error ?? "").includes(
        "UNIQUE constraint failed"
      )
    ) {
      return false
    }
    throw error
  }
}

export function getUsedTopupTx(txHash: string) {
  const row = selectUsedTopupTxStmt.get(txHash) as
    | { tx_hash: string; topup_id: string; used_at: number }
    | undefined

  if (!row) return null

  return {
    tx_hash: String(row.tx_hash),
    topup_id: String(row.topup_id),
    used_at: Number(row.used_at)
  }
}

export function createTopup(params: {
  id: string
  account_id: string
  amount: string
  pay_to: string
  expires_at: number
}) {
  insertTopupStmt.run(
    params.id,
    params.account_id,
    params.amount,
    params.pay_to,
    Date.now(),
    params.expires_at
  )
}

export function getTopup(id: string): TopupRecord | undefined {
  return normalizeTopupRecord(selectTopupStmt.get(id)) ?? undefined
}

export function getTopupForAccount(topupId: string, accountId: string) {
  const row = selectTopupForAccountStmt.get(topupId, accountId) as
    | {
        id: string
        account_id: string
        amount: string
        pay_to: string
        status: string
        tx_hash: string | null
        created_at: number
        expires_at: number
      }
    | undefined

  return normalizeTopupRecord(row)
}

export function confirmTopupAndCredit(params: {
  topupId: string
  txHash: string
}) {
  const { topupId, txHash } = params

  return db.transaction(() => {
    const topup = getTopup(topupId)

    if (!topup) {
      return { ok: false as const, error: "topup_not_found" }
    }

    if (topup.status === "expired") {
      return { ok: false as const, error: "topup_expired" }
    }

    if (Date.now() > topup.expires_at) {
      expirePendingTopupStmt.run(topupId)
      return { ok: false as const, error: "topup_expired" }
    }

    if (topup.status === "confirmed") {
      const balance = getAccountBalance(topup.account_id)
      return {
        ok: true as const,
        already_confirmed: true as const,
        topup_id: topup.id,
        account_id: topup.account_id,
        tx_hash: topup.tx_hash,
        credited_microusdc: 0,
        credited_usdc: "0.000000",
        balance
      }
    }

    const used = getUsedTopupTx(txHash)
    if (used && used.topup_id !== topupId) {
      return { ok: false as const, error: "topup_tx_already_used" }
    }

    if (!used) {
      const inserted = markTopupTxUsed(txHash, topupId)
      if (!inserted) {
        const raced = getUsedTopupTx(txHash)
        if (raced && raced.topup_id !== topupId) {
          return { ok: false as const, error: "topup_tx_already_used" }
        }
      }
    }

    const update = confirmTopupStmt.run(txHash, topupId)

    if (update.changes === 0) {
      const fresh = getTopup(topupId)

      if (!fresh) {
        return { ok: false as const, error: "topup_not_found" }
      }

      if (fresh.status === "confirmed") {
        const balance = getAccountBalance(fresh.account_id)
        return {
          ok: true as const,
          already_confirmed: true as const,
          topup_id: fresh.id,
          account_id: fresh.account_id,
          tx_hash: fresh.tx_hash,
          credited_microusdc: 0,
          credited_usdc: "0.000000",
          balance
        }
      }

      return { ok: false as const, error: "topup_not_confirmable" }
    }

    const microusdc = usdcDecimalToMicrousdc(topup.amount)
    const now = Date.now()

    const balanceRow = selectBalanceStmt.get(topup.account_id) as
      | { balance_microusdc: number }
      | undefined

    const current = Number(balanceRow?.balance_microusdc ?? 0)
    const next = current + microusdc

    updateBalanceStmt.run(next, now, topup.account_id)

    try {
      insertLedgerStmt.run({
        id: randomUUID(),
        account_id: topup.account_id,
        entry_type: "credit",
        amount_microusdc: microusdc,
        reference: topupId,
        metadata_json: JSON.stringify({
          source: "topup",
          tx_hash: txHash
        }),
        created_at: now
      })
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : String(error ?? "")

      if (
        msg.includes("UNIQUE constraint failed") ||
        msg.includes("idx_ledger_credit_topup_reference_unique")
      ) {
        const balance = getAccountBalance(topup.account_id)

        return {
          ok: true as const,
          already_confirmed: true as const,
          topup_id: topup.id,
          account_id: topup.account_id,
          tx_hash: txHash,
          credited_microusdc: 0,
          credited_usdc: "0.000000",
          balance
        }
      }

      throw error
    }

    const balance = getAccountBalance(topup.account_id)

    return {
      ok: true as const,
      already_confirmed: false as const,
      topup_id: topup.id,
      account_id: topup.account_id,
      tx_hash: txHash,
      credited_microusdc: microusdc,
      credited_usdc: topup.amount,
      balance
    }
  })()
}
