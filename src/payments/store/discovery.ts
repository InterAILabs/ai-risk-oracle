import { randomUUID } from "crypto"
import {
  insertDiscoveryEventStmt,
  selectDiscoveryCountsByPathStmt,
  selectDiscoveryCountsByTypeStmt,
  selectDiscoveryDailyCountsStmt,
  selectDiscoveryUniqueClientsStmt,
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

function bucketToDateString(dayBucket: number) {
  return new Date(dayBucket * 86400000).toISOString().slice(0, 10)
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
  const uniqueClients = selectDiscoveryUniqueClientsStmt.get() as
    | { count: number }
    | undefined
  const sinceMs = Date.now() - 7 * 24 * 60 * 60 * 1000
  const dailyRows = selectDiscoveryDailyCountsStmt.all(sinceMs) as Array<{
    event_type: string
    day_bucket: number
    count: number
  }>

  const totalsByType = Object.fromEntries(
    countsByType.map((row) => [row.event_type, row.count])
  )
  const totalsByPath = Object.fromEntries(
    countsByPath.map((row) => [row.path, row.count])
  )
  const dailyByType: Record<string, Record<string, number>> = {}

  for (const row of dailyRows) {
    const key = row.event_type
    const day = bucketToDateString(Number(row.day_bucket))
    dailyByType[key] ||= {}
    dailyByType[key][day] = Number(row.count)
  }

  const funnel = {
    landing_views: Number(totalsByType.landing_view ?? 0),
    discovery_views:
      Number(totalsByType.service_descriptor_view ?? 0) +
      Number(totalsByType.openapi_view ?? 0) +
      Number(totalsByType.agent_card_view ?? 0) +
      Number(totalsByType.discovery_bundle_view ?? 0) +
      Number(totalsByType.service_summary_view ?? 0) +
      Number(totalsByType.service_descriptor_alias_view ?? 0) +
      Number(totalsByType.openapi_alias_view ?? 0) +
      Number(totalsByType.discovery_bundle_alias_view ?? 0),
    pricing_views: Number(totalsByType.pricing_view ?? 0),
    onboard_success: Number(totalsByType.onboard_success ?? 0),
    trial_credit_granted: Number(totalsByType.trial_credit_granted ?? 0),
    topup_create_success: Number(totalsByType.topup_create_success ?? 0),
    topup_confirm_success: Number(totalsByType.topup_confirm_success ?? 0),
    a2a_calls: Number(totalsByType.a2a_call ?? 0),
    a2a_success: Number(totalsByType.a2a_success ?? 0),
    verify_success: Number(totalsByType.verify_success ?? 0),
    verify_batch_success: Number(totalsByType.verify_batch_success ?? 0),
    trust_signature_checks: Number(totalsByType.trust_signature_check ?? 0),
    not_found: Number(totalsByType.not_found ?? 0)
  }

  return {
    unique_clients: Number(uniqueClients?.count ?? 0),
    totals_by_type: totalsByType,
    totals_by_path: totalsByPath,
    daily_by_type: dailyByType,
    funnel,
    recent: recent.map(normalizeRow)
  }
}
