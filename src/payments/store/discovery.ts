import { randomUUID } from "crypto"
import {
  insertDiscoveryEventStmt,
  selectDiscoveryCountsByPathStmt,
  selectDiscoveryCountsByTypeStmt,
  selectRecentDiscoveryEventsStmt
} from "./statements.js"
import type { DiscoveryEventRecord } from "./types.js"

function normalizeRow(row: {
  id: string
  event_type: string
  path: string
  method: string
  client_hint: string | null
  user_agent: string | null
  created_at: number
}): DiscoveryEventRecord {
  return {
    id: row.id,
    event_type: row.event_type,
    path: row.path,
    method: row.method,
    client_hint: row.client_hint,
    user_agent: row.user_agent,
    created_at: row.created_at
  }
}

export function recordDiscoveryEvent(input: {
  eventType: string
  path: string
  method: string
  clientHint?: string | null
  userAgent?: string | null
}) {
  insertDiscoveryEventStmt.run(
    randomUUID(),
    input.eventType,
    input.path,
    input.method,
    input.clientHint ?? null,
    input.userAgent ?? null,
    Date.now()
  )
}

export function getDiscoveryStats(limit = 20) {
  const countsByType = selectDiscoveryCountsByTypeStmt.all() as Array<{
    event_type: string
    count: number
  }>
  const countsByPath = selectDiscoveryCountsByPathStmt.all() as Array<{
    path: string
    count: number
  }>
  const recent = selectRecentDiscoveryEventsStmt.all(limit) as Array<{
    id: string
    event_type: string
    path: string
    method: string
    client_hint: string | null
    user_agent: string | null
    created_at: number
  }>

  return {
    totals_by_type: Object.fromEntries(
      countsByType.map((row) => [row.event_type, row.count])
    ),
    totals_by_path: Object.fromEntries(
      countsByPath.map((row) => [row.path, row.count])
    ),
    recent: recent.map(normalizeRow)
  }
}
