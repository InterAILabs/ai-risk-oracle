import { db } from "./db.js"

export const insertQuoteStmt = db.prepare(`
  INSERT INTO payments (ref, amount, pay_to, created_at, expires_at, status)
  VALUES (@ref, @amount, @pay_to, @created_at, @expires_at, @status)
`)

export const selectPaymentStmt = db.prepare(`
  SELECT ref, amount, pay_to, created_at, expires_at, status, tx_hash
  FROM payments
  WHERE ref = ?
`)

export const expireQuotedIfNeededStmt = db.prepare(`
  UPDATE payments
  SET status = 'expired'
  WHERE ref = ?
    AND status = 'quoted'
    AND expires_at < ?
`)

export const expireAllQuotedStmt = db.prepare(`
  UPDATE payments
  SET status = 'expired'
  WHERE status = 'quoted'
    AND expires_at < ?
`)

export const markPaidStmt = db.prepare(`
  UPDATE payments
  SET status = 'paid',
      tx_hash = COALESCE(?, tx_hash)
  WHERE ref = ?
    AND status = 'quoted'
    AND expires_at >= ?
`)

export const consumeStmt = db.prepare(`
  UPDATE payments
  SET status = 'consumed'
  WHERE ref = ?
    AND status = 'paid'
`)

export const selectUsedTxStmt = db.prepare(`
  SELECT tx_hash, ref, used_at
  FROM used_txs
  WHERE tx_hash = ?
`)

export const insertUsedTxStmt = db.prepare(`
  INSERT INTO used_txs (tx_hash, ref, used_at)
  VALUES (?, ?, ?)
`)

export const selectUsedTopupTxStmt = db.prepare(`
  SELECT tx_hash, topup_id, used_at
  FROM used_topup_txs
  WHERE tx_hash = ?
`)

export const insertUsedTopupTxStmt = db.prepare(`
  INSERT INTO used_topup_txs (tx_hash, topup_id, used_at)
  VALUES (?, ?, ?)
`)

export const statsStmt = db.prepare(`
  SELECT status, COUNT(*) AS count
  FROM payments
  GROUP BY status
`)

export const countUsedTxsStmt = db.prepare(`
  SELECT COUNT(*) AS count
  FROM used_txs
`)

export const insertAccountStmt = db.prepare(`
  INSERT INTO accounts (id, name, status, created_at)
  VALUES (@id, @name, @status, @created_at)
`)

export const insertBalanceStmt = db.prepare(`
  INSERT INTO balances (account_id, balance_microusdc, updated_at)
  VALUES (@account_id, @balance_microusdc, @updated_at)
`)

export const selectAccountStmt = db.prepare(`
  SELECT id, name, status, created_at
  FROM accounts
  WHERE id = ?
`)

export const selectBalanceStmt = db.prepare(`
  SELECT account_id, balance_microusdc, updated_at
  FROM balances
  WHERE account_id = ?
`)

export const updateBalanceStmt = db.prepare(`
  UPDATE balances
  SET balance_microusdc = ?,
      updated_at = ?
  WHERE account_id = ?
`)

export const insertLedgerStmt = db.prepare(`
  INSERT INTO ledger (id, account_id, entry_type, amount_microusdc, reference, metadata_json, created_at)
  VALUES (@id, @account_id, @entry_type, @amount_microusdc, @reference, @metadata_json, @created_at)
`)

export const insertUsageStmt = db.prepare(`
  INSERT INTO usage (id, account_id, service, units, cost_microusdc, reference, created_at)
  VALUES (@id, @account_id, @service, @units, @cost_microusdc, @reference, @created_at)
`)

export const selectUsageByReferenceStmt = db.prepare(`
  SELECT id, account_id, service, units, cost_microusdc, reference, created_at
  FROM usage
  WHERE account_id = ?
    AND reference = ?
  LIMIT 1
`)

export const insertApiKeyStmt = db.prepare(`
  INSERT INTO api_keys (id, account_id, name, key_prefix, key_hash, status, created_at)
  VALUES (@id, @account_id, @name, @key_prefix, @key_hash, @status, @created_at)
`)

export const selectApiKeyByHashStmt = db.prepare(`
  SELECT id, account_id, name, key_prefix, key_hash, status, created_at, last_used_at
  FROM api_keys
  WHERE key_hash = ?
  LIMIT 1
`)

export const touchApiKeyLastUsedStmt = db.prepare(`
  UPDATE api_keys
  SET last_used_at = ?
  WHERE id = ?
`)

export const selectApiKeyByRawHashStmt = db.prepare(`
  SELECT id, account_id, name, key_prefix, status, created_at
  FROM api_keys
  WHERE key_hash = ?
  LIMIT 1
`)

export const selectApiKeyByIdForAccountStmt = db.prepare(`
  SELECT id, account_id, name, key_prefix, status, created_at, last_used_at
  FROM api_keys
  WHERE id = ?
    AND account_id = ?
  LIMIT 1
`)

export const revokeApiKeyStmt = db.prepare(`
  UPDATE api_keys
  SET status = 'revoked'
  WHERE id = ?
    AND account_id = ?
    AND status = 'active'
`)

export const countApiKeysStmt = db.prepare(`
  SELECT COUNT(*) AS count
  FROM api_keys
`)

export const ledgerCountStmt = db.prepare(`
  SELECT COUNT(*) AS count
  FROM ledger
`)

export const usageCountStmt = db.prepare(`
  SELECT COUNT(*) AS count
  FROM usage
`)

export const selectLedgerForAccountStmt = db.prepare(`
  SELECT id, account_id, entry_type, amount_microusdc, reference, metadata_json, created_at
  FROM ledger
  WHERE account_id = ?
  ORDER BY created_at DESC
  LIMIT ?
`)

export const selectUsageForAccountStmt = db.prepare(`
  SELECT id, account_id, service, units, cost_microusdc, reference, created_at
  FROM usage
  WHERE account_id = ?
  ORDER BY created_at DESC
  LIMIT ?
`)

export const insertTrustReceiptStmt = db.prepare(`
  INSERT INTO trust_receipts (
    receipt_id,
    issued_at,
    oracle_version,
    signals_version,
    request_hash,
    domain,
    account_id,
    usage_id,
    payment_ref,
    trust_score,
    risk_level,
    confidence_band,
    dominant_negatives_json,
    dominant_positives_json,
    signature,
    signature_alg
  )
  VALUES (
    @receipt_id,
    @issued_at,
    @oracle_version,
    @signals_version,
    @request_hash,
    @domain,
    @account_id,
    @usage_id,
    @payment_ref,
    @trust_score,
    @risk_level,
    @confidence_band,
    @dominant_negatives_json,
    @dominant_positives_json,
    @signature,
    @signature_alg
  )
`)

export const selectTrustReceiptsForAccountStmt = db.prepare(`
  SELECT
    receipt_id,
    issued_at,
    oracle_version,
    signals_version,
    request_hash,
    domain,
    account_id,
    usage_id,
    payment_ref,
    trust_score,
    risk_level,
    confidence_band,
    dominant_negatives_json,
    dominant_positives_json,
    signature,
    signature_alg
  FROM trust_receipts
  WHERE account_id = ?
  ORDER BY issued_at DESC
  LIMIT ?
`)

export const selectTrustReceiptByIdStmt = db.prepare(`
  SELECT
    receipt_id,
    issued_at,
    oracle_version,
    signals_version,
    request_hash,
    domain,
    account_id,
    usage_id,
    payment_ref,
    trust_score,
    risk_level,
    confidence_band,
    dominant_negatives_json,
    dominant_positives_json,
    signature,
    signature_alg
  FROM trust_receipts
  WHERE receipt_id = ?
  LIMIT 1
`)

export const insertTopupStmt = db.prepare(`
  INSERT INTO topups (id, account_id, amount, pay_to, status, created_at, expires_at)
  VALUES (?, ?, ?, ?, 'pending', ?, ?)
`)

export const selectTopupStmt = db.prepare(`
  SELECT id, account_id, amount, pay_to, status, tx_hash, created_at, expires_at
  FROM topups
  WHERE id = ?
`)

export const selectTopupForAccountStmt = db.prepare(`
  SELECT id, account_id, amount, pay_to, status, tx_hash, created_at, expires_at
  FROM topups
  WHERE id = ? AND account_id = ?
`)

export const expirePendingTopupStmt = db.prepare(`
  UPDATE topups
  SET status = 'expired'
  WHERE id = ?
    AND status != 'confirmed'
`)

export const confirmTopupStmt = db.prepare(`
  UPDATE topups
  SET status = 'confirmed',
      tx_hash = ?
  WHERE id = ?
    AND status = 'pending'
`)

export const insertDiscoveryEventStmt = db.prepare(`
  INSERT INTO discovery_events (
    id,
    event_type,
    path,
    method,
    client_hint,
    user_agent,
    created_at
  )
  VALUES (?, ?, ?, ?, ?, ?, ?)
`)

export const selectDiscoveryCountsByTypeStmt = db.prepare(`
  SELECT event_type, COUNT(*) AS count
  FROM discovery_events
  GROUP BY event_type
`)

export const selectDiscoveryCountsByPathStmt = db.prepare(`
  SELECT path, COUNT(*) AS count
  FROM discovery_events
  GROUP BY path
  ORDER BY count DESC, path ASC
`)

export const selectRecentDiscoveryEventsStmt = db.prepare(`
  SELECT id, event_type, path, method, client_hint, user_agent, created_at
  FROM discovery_events
  ORDER BY created_at DESC
  LIMIT ?
`)
