import { DatabaseSync } from "node:sqlite"

/** Node 22.13+. Share this file between workers on ONE host; use a shared database across hosts. */
export class SqliteReplayStore {
  constructor(filename) {
    this.db = new DatabaseSync(filename)
    this.db.exec("PRAGMA busy_timeout=5000; CREATE TABLE IF NOT EXISTS consumed_authorizations (replay_key TEXT PRIMARY KEY)")
    this.insert = this.db.prepare("INSERT INTO consumed_authorizations(replay_key) VALUES (?) ON CONFLICT(replay_key) DO NOTHING")
  }
  consumeOnce(key) { return Number(this.insert.run(key).changes) === 1 }
  close() { this.db.close() }
}

function freeze(value) {
  if (value && typeof value === "object") {
    Object.freeze(value)
    for (const child of Object.values(value)) freeze(child)
  }
  return value
}

/** Call immediately around the host's executor. Never rebuild arguments after this gate. */
export async function dispatchWithInterAI({ client, receiptId, buildFinalIntent, replayStore, execute }) {
  const lookup = await client.getTrustReceipt(receiptId)
  const finalIntent = freeze(structuredClone(buildFinalIntent()))
  const gate = await client.validateAndConsumeReceipt({ lookup, finalIntent, replayStore })
  if (!gate.ok) throw new Error(`InterAI dispatch denied: ${gate.code}`)
  return execute(finalIntent.canonical_action.arguments)
}
