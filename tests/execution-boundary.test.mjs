import assert from "node:assert/strict"
import { test } from "node:test"
import fs from "node:fs"
import os from "node:os"
import path from "node:path"
import { InterAIRiskOracleClient, executionIntentDigest } from "../sdk/typescript/dist/index.js"
import { SqliteReplayStore, dispatchWithInterAI } from "../examples/execution-boundary/durable-dispatch.mjs"

test("signed receipt binding, durable replay, restart and argument immutability", async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "interai-replay-"))
  const filename = path.join(dir, "replay.db")
  const client = new InterAIRiskOracleClient({ baseUrl: "https://service.invalid", apiKey: "test-only" })
  const intent = { schema: "interai-canonical-execution-intent/v2", action_authority: "host_attested_canonical", canonical_action: { arguments: { record: "a" } }, evaluation_context: {}, authoritative_context: {}, policy_authority: {} }
  const digest = await executionIntentDigest(intent)
  const now = Date.now()
  const authorization = { schema: "interai-execution-authorization/v1", decision_id: "receipt-test", decision: "allow", single_use: true, execution_intent_digest: digest, issued_at: new Date(now - 1000).toISOString(), expires_at: new Date(now + 59000).toISOString() }
  const receipt = { receipt_id: "receipt-test", receipt_schema_version: "trust-receipt/v2", request_contract: "autonomous_execution", final_decision: "allow", execution_intent_digest: digest, execution_authorization: authorization }
  const lookup = { ok: true, receipt, verification: { signed: true, signature: "synthetic-signature", signature_alg: "hmac-sha256", signed_payload: JSON.stringify(receipt) } }
  const originalFetch = globalThis.fetch
  globalThis.fetch = async (_url, options) => {
    const input = JSON.parse(options.body)
    // Model the service's structured-receipt + opaque-payload binding, not only a boolean mock.
    return new Response(JSON.stringify({ valid: JSON.stringify(input.receipt) === JSON.stringify(receipt) && input.signed_payload === lookup.verification.signed_payload, signature_alg: "hmac-sha256" }), { status: 200 })
  }
  let first = new SqliteReplayStore(filename), second = new SqliteReplayStore(filename)
  try {
    const tampered = structuredClone(lookup)
    tampered.receipt.execution_authorization.expires_at = new Date(now + 58000).toISOString()
    assert.equal((await client.validateAndConsumeReceipt({ lookup: tampered, finalIntent: intent, replayStore: first })).code, "receipt_signature_invalid")
    const changed = structuredClone(intent); changed.canonical_action.arguments.record = "b"
    assert.equal((await client.validateAndConsumeReceipt({ lookup, finalIntent: changed, replayStore: first })).code, "execution_intent_mismatch")
    const results = await Promise.all([first, second].map(replayStore => client.validateAndConsumeReceipt({ lookup, finalIntent: intent, replayStore })))
    assert.equal(results.filter(result => result.ok).length, 1)
    assert.equal(results.filter(result => result.code === "authorization_replayed").length, 1)
    first.close(); first = new SqliteReplayStore(filename)
    assert.equal((await client.validateAndConsumeReceipt({ lookup, finalIntent: intent, replayStore: first })).code, "authorization_replayed")
    await assert.rejects(() => client.validateAndConsumeReceipt({ lookup, finalIntent: intent, replayStore: { consumeOnce() { throw new Error("database unavailable") } } }), /database unavailable/)
    // Wrapper dispatches only the snapshot supplied to the gate.
    const wrappedClient = { getTrustReceipt: async () => lookup, validateAndConsumeReceipt: async ({ finalIntent }) => { assert.ok(Object.isFrozen(finalIntent.canonical_action.arguments)); return { ok: true } } }
    await dispatchWithInterAI({ client: wrappedClient, receiptId: receipt.receipt_id, buildFinalIntent: () => intent, replayStore: first, execute: args => { assert.throws(() => { args.record = "b" }, TypeError); assert.equal(args.record, "a") } })
  } finally {
    first.close(); second.close(); globalThis.fetch = originalFetch
    fs.rmSync(dir, { recursive: true, force: true })
  }
})
