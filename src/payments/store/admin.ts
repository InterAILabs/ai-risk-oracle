import { microusdcToUsdcString } from "../../lib/money.js"
import { db } from "./db.js"
import { getDiscoveryStats } from "./discovery.js"

function countByStatus(table: "accounts" | "topups") {
  const rows = db
    .prepare(`SELECT status, COUNT(*) AS count FROM ${table} GROUP BY status`)
    .all() as Array<{ status: string; count: number }>

  return Object.fromEntries(rows.map((row) => [row.status, Number(row.count)]))
}

export function getAdminStats() {
  const accountCounts = countByStatus("accounts")
  const topupCounts = countByStatus("topups")
  const balance = db
    .prepare("SELECT COALESCE(SUM(balance_microusdc), 0) AS total FROM balances")
    .get() as { total: number } | undefined
  const usage = db
    .prepare(
      "SELECT COUNT(*) AS count, COALESCE(SUM(cost_microusdc), 0) AS total_cost, MAX(created_at) AS latest_at FROM usage"
    )
    .get() as
    | { count: number; total_cost: number; latest_at: number | null }
    | undefined
  const receipts = db
    .prepare("SELECT COUNT(*) AS count, MAX(issued_at) AS latest_at FROM trust_receipts")
    .get() as { count: number; latest_at: string | null } | undefined

  const totalBalanceMicrousdc = Number(balance?.total ?? 0)
  const totalUsageMicrousdc = Number(usage?.total_cost ?? 0)

  return {
    accounts: {
      total: Number(accountCounts.active ?? 0) + Number(accountCounts.disabled ?? 0),
      active: Number(accountCounts.active ?? 0),
      disabled: Number(accountCounts.disabled ?? 0)
    },
    balance: {
      total_microusdc: totalBalanceMicrousdc,
      total_usdc: microusdcToUsdcString(totalBalanceMicrousdc)
    },
    usage: {
      total_count: Number(usage?.count ?? 0),
      total_cost_microusdc: totalUsageMicrousdc,
      total_cost_usdc: microusdcToUsdcString(totalUsageMicrousdc),
      latest_at: usage?.latest_at ? new Date(Number(usage.latest_at)).toISOString() : null
    },
    receipts: {
      total_count: Number(receipts?.count ?? 0),
      latest_at: receipts?.latest_at ?? null
    },
    topups: {
      pending: Number(topupCounts.pending ?? 0),
      confirmed: Number(topupCounts.confirmed ?? 0),
      expired: Number(topupCounts.expired ?? 0)
    },
    discovery: {
      recent: getDiscoveryStats(10).recent
    }
  }
}

export function listAdminAccounts(limit = 50) {
  const safeLimit = Math.max(1, Math.min(Number(limit || 50), 200))
  const rows = db
    .prepare(
      `
      SELECT
        a.id AS account_id,
        a.name AS name,
        a.status AS status,
        a.created_at AS created_at,
        COALESCE(b.balance_microusdc, 0) AS balance_microusdc,
        COALESCE(u.usage_count, 0) AS usage_count,
        COALESCE(r.receipts_count, 0) AS receipts_count
      FROM accounts a
      LEFT JOIN balances b ON b.account_id = a.id
      LEFT JOIN (
        SELECT account_id, COUNT(*) AS usage_count
        FROM usage
        GROUP BY account_id
      ) u ON u.account_id = a.id
      LEFT JOIN (
        SELECT account_id, COUNT(*) AS receipts_count
        FROM trust_receipts
        WHERE account_id IS NOT NULL
        GROUP BY account_id
      ) r ON r.account_id = a.id
      ORDER BY a.created_at DESC
      LIMIT ?
    `
    )
    .all(safeLimit) as Array<{
    account_id: string
    name: string | null
    status: "active" | "disabled"
    created_at: number
    balance_microusdc: number
    usage_count: number
    receipts_count: number
  }>

  return rows.map((row) => ({
    account_id: row.account_id,
    name: row.name,
    status: row.status,
    balance_microusdc: Number(row.balance_microusdc),
    balance_usdc: microusdcToUsdcString(Number(row.balance_microusdc)),
    created_at: Number(row.created_at),
    usage_count: Number(row.usage_count),
    receipts_count: Number(row.receipts_count)
  }))
}
