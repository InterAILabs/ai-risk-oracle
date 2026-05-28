import {
  createAccount,
  createApiKey,
  creditAccount,
  debitAccountForUsage,
  getAccount,
  getAccountBalance,
  getApiKeyByIdForAccount,
  getApiKeyByRaw,
  hasUsageReference,
  listLedgerForAccount,
  listUsageForAccount,
  resolveAccountByApiKey,
  revokeApiKey
} from "./store/accounts.js"
import {
  confirmOnchainPayment,
  consume,
  createQuote,
  getPayment,
  getPaymentStats,
  isTxUsed,
  markPaid,
  markTxUsed
} from "./store/payments.js"
import {
  createTrustReceipt,
  getTrustHistoryForAccountDomain,
  getTrustReputationForAccount,
  getTrustReceiptById,
  listTrustReceipts
} from "./store/receipts.js"
import {
  confirmTopupAndCredit,
  createTopup,
  getTopup,
  getTopupForAccount,
  getUsedTopupTx,
  markTopupTxUsed
} from "./store/topups.js"
import {
  getDiscoveryStats,
  recordDiscoveryEvent
} from "./store/discovery.js"
import {
  getAdminStats,
  listAdminAccounts
} from "./store/admin.js"
import {
  createIdempotencyRecord,
  getIdempotencyRecord
} from "./store/idempotency.js"
import type {
  DiscoveryEventRecord,
  PaymentRecord,
  PaymentStatus,
  TrustReceiptRecord
} from "./store/types.js"
import { checkDatabaseReady } from "./store/db.js"

export type {
  DiscoveryEventRecord,
  PaymentRecord,
  PaymentStatus,
  TrustReceiptRecord
} from "./store/types.js"
export {
  checkDatabaseReady,
  confirmOnchainPayment,
  confirmTopupAndCredit,
  consume,
  createAccount,
  createApiKey,
  createIdempotencyRecord,
  createTopup,
  createTrustReceipt,
  getAdminStats,
  createQuote,
  creditAccount,
  debitAccountForUsage,
  getAccount,
  getAccountBalance,
  getApiKeyByIdForAccount,
  getApiKeyByRaw,
  getDiscoveryStats,
  getIdempotencyRecord,
  getPayment,
  getPaymentStats,
  getTopup,
  getTopupForAccount,
  getTrustHistoryForAccountDomain,
  getTrustReputationForAccount,
  getTrustReceiptById,
  getUsedTopupTx,
  hasUsageReference,
  isTxUsed,
  listLedgerForAccount,
  listAdminAccounts,
  listTrustReceipts,
  listUsageForAccount,
  markPaid,
  markTopupTxUsed,
  markTxUsed,
  recordDiscoveryEvent,
  resolveAccountByApiKey,
  revokeApiKey
}

