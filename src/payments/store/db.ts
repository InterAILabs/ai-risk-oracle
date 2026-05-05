import fs from "fs"
import path from "path"
import Database from "better-sqlite3"

const DATA_DIR = path.join(process.cwd(), "data")
const DB_FILE = process.env.PAYMENTS_DB_FILE
  ? path.resolve(process.env.PAYMENTS_DB_FILE)
  : path.join(DATA_DIR, "payments.db")
const DB_DIR = path.dirname(DB_FILE)

if (!fs.existsSync(DB_DIR)) {
  fs.mkdirSync(DB_DIR, { recursive: true })
}

export const db = new Database(DB_FILE)

db.pragma("journal_mode = WAL")
db.pragma("synchronous = NORMAL")
db.pragma("foreign_keys = ON")
db.pragma("busy_timeout = 5000")

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

    CREATE TABLE IF NOT EXISTS used_topup_txs (
      tx_hash TEXT PRIMARY KEY,
      topup_id TEXT NOT NULL,
      used_at INTEGER NOT NULL,
      FOREIGN KEY(topup_id) REFERENCES topups(id)
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

    CREATE UNIQUE INDEX IF NOT EXISTS idx_ledger_credit_topup_reference_unique
    ON ledger(account_id, reference, entry_type)
    WHERE reference IS NOT NULL AND entry_type = 'credit';

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

    CREATE TABLE IF NOT EXISTS trust_receipts (
      receipt_id TEXT PRIMARY KEY,
      issued_at TEXT NOT NULL,
      oracle_version TEXT NOT NULL,
      signals_version TEXT NOT NULL,
      request_hash TEXT NOT NULL,
      domain TEXT NOT NULL,
      account_id TEXT,
      usage_id TEXT,
      payment_ref TEXT,
      trust_score REAL NOT NULL,
      risk_level TEXT NOT NULL CHECK(risk_level IN ('low', 'medium', 'high')),
      confidence_band TEXT NOT NULL CHECK(confidence_band IN ('low', 'medium', 'high')),
      dominant_negatives_json TEXT NOT NULL,
      dominant_positives_json TEXT NOT NULL,
      signature TEXT NOT NULL DEFAULT '',
      signature_alg TEXT NOT NULL DEFAULT 'hmac-sha256'
    );

    CREATE INDEX IF NOT EXISTS idx_trust_receipts_account_issued
    ON trust_receipts(account_id, issued_at DESC);

    CREATE INDEX IF NOT EXISTS idx_trust_receipts_request_hash
    ON trust_receipts(request_hash);

    CREATE TABLE IF NOT EXISTS discovery_events (
      id TEXT PRIMARY KEY,
      event_type TEXT NOT NULL,
      path TEXT NOT NULL,
      method TEXT NOT NULL,
      client_hint TEXT,
      user_agent TEXT,
      created_at INTEGER NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_discovery_events_created
    ON discovery_events(created_at DESC);

    CREATE INDEX IF NOT EXISTS idx_discovery_events_type_created
    ON discovery_events(event_type, created_at DESC);
  `)
}

function ensureTrustReceiptSignatureColumns() {
  try {
    db.exec(`ALTER TABLE trust_receipts ADD COLUMN signature TEXT NOT NULL DEFAULT ''`)
  } catch {}

  try {
    db.exec(
      `ALTER TABLE trust_receipts ADD COLUMN signature_alg TEXT NOT NULL DEFAULT 'hmac-sha256'`
    )
  } catch {}
}

ensureSchema()
ensureTrustReceiptSignatureColumns()
