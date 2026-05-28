import { createHash, randomUUID } from "crypto"
import { db } from "./db.js"
import { normalizeAccountRecord, normalizeBalanceRecord } from "./mappers.js"
import {
  insertAccountStmt,
  insertApiKeyStmt,
  insertBalanceStmt,
  insertLedgerStmt,
  insertUsageStmt,
  revokeApiKeyStmt,
  selectAccountStmt,
  selectApiKeyByHashStmt,
  selectApiKeyByIdForAccountStmt,
  selectApiKeyByRawHashStmt,
  selectBalanceStmt,
  selectLedgerForAccountStmt,
  selectUsageByReferenceStmt,
  selectUsageForAccountStmt,
  touchApiKeyLastUsedStmt,
  updateBalanceStmt
} from "./statements.js"
import { microusdcToUsdcString } from "../../lib/money.js"

function hashApiKey(rawKey: string) {
  return createHash("sha256").update(rawKey).digest("hex")
}

export function createAccount(accountId: string, name?: string) {
  const now = Date.now()

  return db.transaction(() => {
    const existing = normalizeAccountRecord(selectAccountStmt.get(accountId))
    if (existing) {
      return existing
    }

    insertAccountStmt.run({
      id: accountId,
      name: name ?? null,
      status: "active",
      created_at: now
    })

    insertBalanceStmt.run({
      account_id: accountId,
      balance_microusdc: 0,
      updated_at: now
    })

    return normalizeAccountRecord(selectAccountStmt.get(accountId))!
  })()
}

export function getAccount(accountId: string) {
  return normalizeAccountRecord(selectAccountStmt.get(accountId))
}

export function getAccountBalance(accountId: string) {
  const row = selectBalanceStmt.get(accountId) as
    | { account_id: string; balance_microusdc: number; updated_at: number }
    | undefined

  return normalizeBalanceRecord(row)
}

export function hasUsageReference(accountId: string, reference: string) {
  const row = selectUsageByReferenceStmt.get(accountId, reference) as
    | {
        id: string
        account_id: string
        service: string
        units: number
        cost_microusdc: number
        reference: string
        created_at: number
      }
    | undefined

  if (!row) return null

  return {
    id: String(row.id),
    account_id: String(row.account_id),
    service: String(row.service),
    units: Number(row.units),
    cost_microusdc: Number(row.cost_microusdc),
    reference: String(row.reference),
    created_at: Number(row.created_at)
  }
}

export function createApiKey(params: {
  id: string
  accountId: string
  rawKey: string
  name?: string
}) {
  const { id, accountId, rawKey, name } = params

  const account = normalizeAccountRecord(selectAccountStmt.get(accountId))
  if (!account) {
    throw new Error("account_not_found")
  }

  if (account.status !== "active") {
    throw new Error("account_not_active")
  }

  const now = Date.now()
  const keyHash = hashApiKey(rawKey)
  const keyPrefix = rawKey.slice(0, 12)

  insertApiKeyStmt.run({
    id,
    account_id: accountId,
    name: name ?? null,
    key_prefix: keyPrefix,
    key_hash: keyHash,
    status: "active",
    created_at: now
  })

  return {
    id,
    account_id: accountId,
    name,
    key_prefix: keyPrefix,
    status: "active" as const,
    created_at: now
  }
}

export function getApiKeyByRaw(rawKey: string) {
  const keyHash = hashApiKey(rawKey)

  const row = selectApiKeyByRawHashStmt.get(keyHash) as
    | {
        id: string
        account_id: string
        name: string
        key_prefix: string
        status: string
        created_at: number
      }
    | undefined

  if (!row) return null

  return {
    id: String(row.id),
    account_id: String(row.account_id),
    name: String(row.name),
    key_prefix: String(row.key_prefix),
    status: String(row.status),
    created_at: Number(row.created_at)
  }
}

export function getApiKeyByIdForAccount(accountId: string, apiKeyId: string) {
  const row = selectApiKeyByIdForAccountStmt.get(apiKeyId, accountId) as
    | {
        id: string
        account_id: string
        name: string | null
        key_prefix: string
        status: "active" | "revoked"
        created_at: number
        last_used_at: number | null
      }
    | undefined

  if (!row) return null

  return {
    id: String(row.id),
    account_id: String(row.account_id),
    name: row.name ? String(row.name) : undefined,
    key_prefix: String(row.key_prefix),
    status: row.status,
    created_at: Number(row.created_at),
    last_used_at: row.last_used_at == null ? null : Number(row.last_used_at)
  }
}

export function revokeApiKey(accountId: string, apiKeyId: string) {
  return db.transaction(() => {
    const existing = getApiKeyByIdForAccount(accountId, apiKeyId)

    if (!existing) {
      throw new Error("api_key_not_found")
    }

    if (existing.status === "revoked") {
      return {
        ...existing,
        already_revoked: true as const
      }
    }

    const result = revokeApiKeyStmt.run(apiKeyId, accountId)

    if (result.changes === 0) {
      throw new Error("api_key_revoke_failed")
    }

    const updated = getApiKeyByIdForAccount(accountId, apiKeyId)
    if (!updated) {
      throw new Error("api_key_not_found")
    }

    return {
      ...updated,
      already_revoked: false as const
    }
  })()
}

export function resolveAccountByApiKey(rawKey: string) {
  const keyHash = hashApiKey(rawKey)

  const row = selectApiKeyByHashStmt.get(keyHash) as
    | {
        id: string
        account_id: string
        name: string | null
        key_prefix: string
        key_hash: string
        status: "active" | "revoked"
        created_at: number
        last_used_at: number | null
      }
    | undefined

  if (!row) return null
  if (row.status !== "active") return null

  touchApiKeyLastUsedStmt.run(Date.now(), row.id)

  const account = normalizeAccountRecord(selectAccountStmt.get(row.account_id))
  if (!account) return null
  if (account.status !== "active") return null

  return {
    api_key_id: String(row.id),
    account_id: String(row.account_id),
    account
  }
}

export function creditAccount(params: {
  ledgerId: string
  accountId: string
  amountMicrousdc: number
  reference?: string
  metadata?: Record<string, unknown>
}) {
  const { ledgerId, accountId, amountMicrousdc, reference, metadata } = params

  if (!Number.isInteger(amountMicrousdc) || amountMicrousdc <= 0) {
    throw new Error("invalid_credit_amount")
  }

  return db.transaction(() => {
    const account = normalizeAccountRecord(selectAccountStmt.get(accountId))
    if (!account) {
      throw new Error("account_not_found")
    }

    if (account.status !== "active") {
      throw new Error("account_not_active")
    }

    const balanceRow = selectBalanceStmt.get(accountId) as
      | { balance_microusdc: number }
      | undefined

    const current = Number(balanceRow?.balance_microusdc ?? 0)
    const next = current + amountMicrousdc
    const now = Date.now()

    updateBalanceStmt.run(next, now, accountId)

    insertLedgerStmt.run({
      id: ledgerId,
      account_id: accountId,
      entry_type: "credit",
      amount_microusdc: amountMicrousdc,
      reference: reference ?? null,
      metadata_json: metadata ? JSON.stringify(metadata) : null,
      created_at: now
    })

    return {
      account_id: accountId,
      balance_microusdc: next,
      balance_usdc: microusdcToUsdcString(next),
      credited_microusdc: amountMicrousdc
    }
  })()
}

export function debitAccountForUsage(params: {
  ledgerId: string
  usageId: string
  accountId: string
  service: string
  costMicrousdc: number
  reference?: string
}) {
  const { ledgerId, usageId, accountId, service, costMicrousdc, reference } = params

  if (!Number.isInteger(costMicrousdc) || costMicrousdc <= 0) {
    throw new Error("invalid_debit_amount")
  }

  const runDebit = db.transaction(() => {
    const account = normalizeAccountRecord(selectAccountStmt.get(accountId))
    if (!account) {
      return { ok: false as const, error: "account_not_found" }
    }

    if (account.status !== "active") {
      return { ok: false as const, error: "account_not_active" }
    }

    const balanceRow = selectBalanceStmt.get(accountId) as
      | { balance_microusdc: number }
      | undefined

    const current = Number(balanceRow?.balance_microusdc ?? 0)

    if (reference) {
      const existing = hasUsageReference(accountId, reference)

      if (existing) {
        return {
          ok: true as const,
          account_id: accountId,
          remaining_balance_microusdc: current,
          remaining_balance_usdc: microusdcToUsdcString(current),
          debited_microusdc: 0,
          billed_cost_microusdc: existing.cost_microusdc,
          idempotent_replay: true as const
        }
      }
    }

    if (current < costMicrousdc) {
      return {
        ok: false as const,
        error: "insufficient_balance",
        balance_microusdc: current
      }
    }

    const next = current - costMicrousdc
    const now = Date.now()

    insertUsageStmt.run({
      id: usageId,
      account_id: accountId,
      service,
      units: 1,
      cost_microusdc: costMicrousdc,
      reference: reference ?? null,
      created_at: now
    })

    updateBalanceStmt.run(next, now, accountId)

    insertLedgerStmt.run({
      id: ledgerId,
      account_id: accountId,
      entry_type: "debit",
      amount_microusdc: costMicrousdc,
      reference: reference ?? null,
      metadata_json: JSON.stringify({ service }),
      created_at: now
    })

    return {
      ok: true as const,
      account_id: accountId,
      remaining_balance_microusdc: next,
      remaining_balance_usdc: microusdcToUsdcString(next),
      debited_microusdc: costMicrousdc,
      billed_cost_microusdc: costMicrousdc,
      idempotent_replay: false as const
    }
  })

  try {
    return runDebit()
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : String(error ?? "")

    if (
      reference &&
      (msg.includes("UNIQUE constraint failed: usage.account_id, usage.reference") ||
        msg.includes("idx_usage_account_reference_unique"))
    ) {
      const existing = hasUsageReference(accountId, reference)
      const balance = getAccountBalance(accountId)

      if (existing && balance) {
        return {
          ok: true as const,
          account_id: accountId,
          remaining_balance_microusdc: balance.balance_microusdc,
          remaining_balance_usdc: balance.balance_usdc,
          debited_microusdc: 0,
          billed_cost_microusdc: existing.cost_microusdc,
          idempotent_replay: true as const
        }
      }
    }

    throw error
  }
}

export function listLedgerForAccount(accountId: string, limit = 20) {
  const safeLimit = Math.max(1, Math.min(100, Number(limit || 20)))

  const rows = selectLedgerForAccountStmt.all(accountId, safeLimit) as Array<{
    id: string
    account_id: string
    entry_type: "credit" | "debit"
    amount_microusdc: number
    reference: string | null
    metadata_json: string | null
    created_at: number
  }>

  return rows.map((row) => ({
    id: String(row.id),
    account_id: String(row.account_id),
    entry_type: row.entry_type,
    amount_microusdc: Number(row.amount_microusdc),
    amount_usdc: microusdcToUsdcString(Number(row.amount_microusdc)),
    reference: row.reference ? String(row.reference) : null,
    metadata: row.metadata_json ? JSON.parse(row.metadata_json) : null,
    created_at: Number(row.created_at)
  }))
}

export function listUsageForAccount(accountId: string, limit = 20) {
  const safeLimit = Math.max(1, Math.min(100, Number(limit || 20)))

  const rows = selectUsageForAccountStmt.all(accountId, safeLimit) as Array<{
    id: string
    account_id: string
    service: string
    units: number
    cost_microusdc: number
    reference: string | null
    created_at: number
  }>

  return rows.map((row) => ({
    id: String(row.id),
    account_id: String(row.account_id),
    service: String(row.service),
    units: Number(row.units),
    cost_microusdc: Number(row.cost_microusdc),
    cost_usdc: microusdcToUsdcString(Number(row.cost_microusdc)),
    reference: row.reference ? String(row.reference) : null,
    created_at: Number(row.created_at)
  }))
}
