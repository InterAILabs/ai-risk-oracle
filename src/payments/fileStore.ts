import fs from "fs"
import path from "path"
import Database from "better-sqlite3"
import { createHash } from "crypto"

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

type AccountRecord = {
  id: string
  name?: string
  status: "active" | "disabled"
  created_at: number
}

type TopupRecord = {
  id: string
  account_id: string
  amount: string
  pay_to: string
  status: string
  tx_hash: string | null
  created_at: number
  expires_at: number
}

const DATA_DIR = path.join(process.cwd(), "data")
const DB_FILE = path.join(DATA_DIR, "payments.db")

if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true })
}

const db = new Database(DB_FILE)
db.pragma("journal_mode = WAL")
db.pragma("synchronous = NORMAL")
db.pragma("foreign_keys = ON")

function ensureSchema() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS topups (
      id TEXT PRIMARY KEY,
      account_id TEXT NOT NULL,
      amount TEXT NOT NULL,
      pay_to TEXT NOT NULL,
      status TEXT NOT NULL,
      tx_hash TEXT,
      created_at INTEGER NOT NULL,
      expires_at INTEGER NOT NULL
    );
    
    CREATE TABLE IF NOT EXISTS payments (
      ref TEXT PRIMARY KEY,
      amount TEXT NOT NULL,
      pay_to TEXT NOT NULL,
      created_at INTEGER NOT NULL,
      expires_at INTEGER NOT NULL,
      status TEXT NOT NULL CHECK(status IN ('quoted', 'paid', 'consumed', 'expired')),
      tx_hash TEXT
    );

    CREATE TABLE IF NOT EXISTS used_txs (
      tx_hash TEXT PRIMARY KEY,
      ref TEXT NOT NULL,
      used_at INTEGER NOT NULL,
      FOREIGN KEY(ref) REFERENCES payments(ref)
    );

    CREATE INDEX IF NOT EXISTS idx_payments_status ON payments(status);
    CREATE INDEX IF NOT EXISTS idx_payments_expires_at ON payments(expires_at);

    CREATE TABLE IF NOT EXISTS accounts (
      id TEXT PRIMARY KEY,
      name TEXT,
      status TEXT NOT NULL CHECK(status IN ('active', 'disabled')),
      created_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS balances (
      account_id TEXT PRIMARY KEY,
      balance_microusdc INTEGER NOT NULL,
      updated_at INTEGER NOT NULL,
      FOREIGN KEY(account_id) REFERENCES accounts(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS ledger (
      id TEXT PRIMARY KEY,
      account_id TEXT NOT NULL,
      entry_type TEXT NOT NULL CHECK(entry_type IN ('credit', 'debit')),
      amount_microusdc INTEGER NOT NULL,
      reference TEXT,
      metadata_json TEXT,
      created_at INTEGER NOT NULL,
      FOREIGN KEY(account_id) REFERENCES accounts(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS usage (
      id TEXT PRIMARY KEY,
      account_id TEXT NOT NULL,
      service TEXT NOT NULL,
      units INTEGER NOT NULL,
      cost_microusdc INTEGER NOT NULL,
      reference TEXT,
      created_at INTEGER NOT NULL,
      FOREIGN KEY(account_id) REFERENCES accounts(id) ON DELETE CASCADE
    );

    CREATE INDEX IF NOT EXISTS idx_accounts_status ON accounts(status);
    CREATE INDEX IF NOT EXISTS idx_ledger_account_created ON ledger(account_id, created_at DESC);
    CREATE INDEX IF NOT EXISTS idx_usage_account_created ON usage(account_id, created_at DESC);
    CREATE UNIQUE INDEX IF NOT EXISTS idx_usage_account_reference_unique
    ON usage(account_id, reference)
    WHERE reference IS NOT NULL;
    
    CREATE TABLE IF NOT EXISTS api_keys (
      id TEXT PRIMARY KEY,
      account_id TEXT NOT NULL,
      name TEXT,
      key_prefix TEXT NOT NULL,
      key_hash TEXT NOT NULL UNIQUE,
      status TEXT NOT NULL CHECK(status IN ('active', 'revoked')),
      created_at INTEGER NOT NULL,
      last_used_at INTEGER,
      FOREIGN KEY(account_id) REFERENCES accounts(id) ON DELETE CASCADE
    );

    CREATE INDEX IF NOT EXISTS idx_api_keys_account_status ON api_keys(account_id, status);
    CREATE INDEX IF NOT EXISTS idx_api_keys_prefix ON api_keys(key_prefix);
  `)
}

ensureSchema()

const insertQuoteStmt = db.prepare(`
  INSERT INTO payments (ref, amount, pay_to, created_at, expires_at, status)
  VALUES (@ref, @amount, @pay_to, @created_at, @expires_at, @status)
`)

const selectPaymentStmt = db.prepare(`
  SELECT ref, amount, pay_to, created_at, expires_at, status, tx_hash
  FROM payments
  WHERE ref = ?
`)

const expireQuotedIfNeededStmt = db.prepare(`
  UPDATE payments
  SET status = 'expired'
  WHERE ref = ?
    AND status = 'quoted'
    AND expires_at < ?
`)

const expireAllQuotedStmt = db.prepare(`
  UPDATE payments
  SET status = 'expired'
  WHERE status = 'quoted'
    AND expires_at < ?
`)

const markPaidStmt = db.prepare(`
  UPDATE payments
  SET status = 'paid',
      tx_hash = COALESCE(?, tx_hash)
  WHERE ref = ?
    AND status = 'quoted'
    AND expires_at >= ?
`)

const consumeStmt = db.prepare(`
  UPDATE payments
  SET status = 'consumed'
  WHERE ref = ?
    AND status = 'paid'
`)

const selectUsedTxStmt = db.prepare(`
  SELECT tx_hash, ref, used_at
  FROM used_txs
  WHERE tx_hash = ?
`)

const insertUsedTxStmt = db.prepare(`
  INSERT INTO used_txs (tx_hash, ref, used_at)
  VALUES (?, ?, ?)
`)

const statsStmt = db.prepare(`
  SELECT status, COUNT(*) AS count
  FROM payments
  GROUP BY status
`)

const countUsedTxsStmt = db.prepare(`
  SELECT COUNT(*) AS count
  FROM used_txs
`)

const insertAccountStmt = db.prepare(`
  INSERT INTO accounts (id, name, status, created_at)
  VALUES (@id, @name, @status, @created_at)
`)

const insertBalanceStmt = db.prepare(`
  INSERT INTO balances (account_id, balance_microusdc, updated_at)
  VALUES (@account_id, @balance_microusdc, @updated_at)
`)

const selectAccountStmt = db.prepare(`
  SELECT id, name, status, created_at
  FROM accounts
  WHERE id = ?
`)

const selectBalanceStmt = db.prepare(`
  SELECT account_id, balance_microusdc, updated_at
  FROM balances
  WHERE account_id = ?
`)

const updateBalanceStmt = db.prepare(`
  UPDATE balances
  SET balance_microusdc = ?,
      updated_at = ?
  WHERE account_id = ?
`)

const insertLedgerStmt = db.prepare(`
  INSERT INTO ledger (id, account_id, entry_type, amount_microusdc, reference, metadata_json, created_at)
  VALUES (@id, @account_id, @entry_type, @amount_microusdc, @reference, @metadata_json, @created_at)
`)

const insertUsageStmt = db.prepare(`
  INSERT INTO usage (id, account_id, service, units, cost_microusdc, reference, created_at)
  VALUES (@id, @account_id, @service, @units, @cost_microusdc, @reference, @created_at)
`)

const selectUsageByReferenceStmt = db.prepare(`
  SELECT id, account_id, service, units, cost_microusdc, reference, created_at
  FROM usage
  WHERE account_id = ?
    AND reference = ?
  LIMIT 1
`)

const insertApiKeyStmt = db.prepare(`
  INSERT INTO api_keys (id, account_id, name, key_prefix, key_hash, status, created_at)
  VALUES (@id, @account_id, @name, @key_prefix, @key_hash, @status, @created_at)
`)

const selectApiKeyByHashStmt = db.prepare(`
  SELECT id, account_id, name, key_prefix, key_hash, status, created_at, last_used_at
  FROM api_keys
  WHERE key_hash = ?
  LIMIT 1
`)

const touchApiKeyLastUsedStmt = db.prepare(`
  UPDATE api_keys
  SET last_used_at = ?
  WHERE id = ?
`)

const selectApiKeyByIdForAccountStmt = db.prepare(`
  SELECT id, account_id, name, key_prefix, status, created_at, last_used_at
  FROM api_keys
  WHERE id = ?
    AND account_id = ?
  LIMIT 1
`)

const revokeApiKeyStmt = db.prepare(`
  UPDATE api_keys
  SET status = 'revoked'
  WHERE id = ?
    AND account_id = ?
    AND status = 'active'
`)

const countApiKeysStmt = db.prepare(`
  SELECT COUNT(*) AS count
  FROM api_keys
`)

const ledgerCountStmt = db.prepare(`
  SELECT COUNT(*) AS count
  FROM ledger
`)

const usageCountStmt = db.prepare(`
  SELECT COUNT(*) AS count
  FROM usage
`)

function normalizePaymentRecord(row: any): PaymentRecord | null {
  if (!row) return null

  return {
    ref: String(row.ref),
    amount: String(row.amount),
    pay_to: String(row.pay_to),
    created_at: Number(row.created_at),
    expires_at: Number(row.expires_at),
    status: row.status as PaymentStatus,
    tx_hash: row.tx_hash ? String(row.tx_hash) : undefined
  }
}

function normalizeAccountRecord(row: any): AccountRecord | null {
  if (!row) return null

  return {
    id: String(row.id),
    name: row.name ? String(row.name) : undefined,
    status: row.status as "active" | "disabled",
    created_at: Number(row.created_at)
  }
}

function hashApiKey(rawKey: string) {
  return createHash("sha256").update(rawKey).digest("hex")
}

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

export function getPayment(ref: string): PaymentRecord | null {
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
  } catch (error: any) {
    if (String(error?.message || "").includes("UNIQUE constraint failed")) {
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

  if (!row) return null

  return {
    account_id: String(row.account_id),
    balance_microusdc: Number(row.balance_microusdc),
    balance_usdc: (Number(row.balance_microusdc) / 1_000_000).toFixed(6),
    updated_at: Number(row.updated_at)
  }
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
      balance_usdc: (next / 1_000_000).toFixed(6),
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
          remaining_balance_usdc: (current / 1_000_000).toFixed(6),
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
      remaining_balance_usdc: (next / 1_000_000).toFixed(6),
      debited_microusdc: costMicrousdc,
      billed_cost_microusdc: costMicrousdc,
      idempotent_replay: false as const
    }
  })

  try {
    return runDebit()
  } catch (error: any) {
    const msg = String(error?.message || "")

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

 export function createTopup(params: {
  id: string
  account_id: string
  amount: string
  pay_to: string
  expires_at: number
}) {
  db.prepare(`
    INSERT INTO topups (id, account_id, amount, pay_to, status, created_at, expires_at)
    VALUES (?, ?, ?, ?, 'pending', ?, ?)
  `).run(
    params.id,
    params.account_id,
    params.amount,
    params.pay_to,
    Date.now(),
    params.expires_at
  )
}

export function getTopup(id: string): TopupRecord | undefined {
  return db
    .prepare(`SELECT * FROM topups WHERE id = ?`)
    .get(id) as TopupRecord | undefined
}

export function confirmTopup(id: string, tx_hash: string) {
  db.prepare(`
    UPDATE topups
    SET status = 'confirmed', tx_hash = ?
    WHERE id = ?
  `).run(tx_hash, id)
}

