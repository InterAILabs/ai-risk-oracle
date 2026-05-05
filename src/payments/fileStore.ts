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
import { createTrustReceipt, getTrustReceiptById, listTrustReceipts } from "./store/receipts.js"
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
import type {
  DiscoveryEventRecord,
  PaymentRecord,
  PaymentStatus,
  TrustReceiptRecord
} from "./store/types.js"

export type {
  DiscoveryEventRecord,
  PaymentRecord,
  PaymentStatus,
  TrustReceiptRecord
} from "./store/types.js"
export {
  confirmOnchainPayment,
  confirmTopupAndCredit,
  consume,
  createAccount,
  createApiKey,
  createTopup,
  createTrustReceipt,
  createQuote,
  creditAccount,
  debitAccountForUsage,
  getAccount,
  getAccountBalance,
  getApiKeyByIdForAccount,
  getApiKeyByRaw,
  getDiscoveryStats,
  getPayment,
  getPaymentStats,
  getTopup,
  getTopupForAccount,
  getTrustReceiptById,
  getUsedTopupTx,
  hasUsageReference,
  isTxUsed,
  listLedgerForAccount,
  listTrustReceipts,
  listUsageForAccount,
  markPaid,
  markTopupTxUsed,
  markTxUsed,
  recordDiscoveryEvent,
  resolveAccountByApiKey,
  revokeApiKey
}

