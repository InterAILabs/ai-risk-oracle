import assert from "node:assert/strict"
import {
  InterAIRiskOracleClient,
  SDK_VERSION
} from "interai-risk-oracle"

const baseUrl = process.env.INTERAI_BASE_URL || "https://api.interailabs.dev"
const maxActivationMs = Number(process.env.INTERAI_CLEAN_ROOM_MAX_MS || 5 * 60 * 1000)
const startedAt = Date.now()
const runId = `${Date.now()}-${Math.random().toString(16).slice(2)}`

assert.equal(SDK_VERSION, "0.1.7-beta")

const client = new InterAIRiskOracleClient({
  baseUrl,
  timeoutMs: 15_000
})

const onboarding = await client.onboard({
  name: `clean-room-builder-${runId}`,
  api_key_name: "clean-room-first-verify",
  scope: "demo_trial"
})

assert.equal(onboarding.ok, true)
assert.equal(typeof onboarding.api_key, "string")
assert.ok(onboarding.api_key.length > 0)

const decision = await client.verify({
  use_case: "agent-before-tool-execution",
  action: {
    type: "read_only_lookup",
    name: "check_order_status",
    description: "Read an order status from a sandbox system",
    external_side_effect: false,
    irreversible: false
  },
  context: {
    agent_id: "clean-room-builder",
    environment: "sandbox",
    user_confirmation: true
  },
  policy: {
    require_trust_receipt: true
  }
}, `clean-room-first-verify-${runId}`)

const receiptId = decision.trust_receipt_id || decision.trust_receipt?.receipt_id
assert.equal(typeof receiptId, "string")
assert.ok(receiptId.length > 0)

const lookup = await client.getTrustReceipt(receiptId)
assert.equal(lookup.ok, true)
assert.equal(lookup.receipt.receipt_id, receiptId)
assert.notEqual(lookup.visibility, "public_summary")
assert.equal(lookup.verification?.signature_valid, true)

const signature = await client.verifyTrustReceiptSignature(lookup)
assert.equal(signature.valid, true)

const elapsedMs = Date.now() - startedAt
assert.ok(
  elapsedMs <= maxActivationMs,
  `Clean-room activation exceeded ${maxActivationMs} ms: ${elapsedMs} ms`
)

console.log(JSON.stringify({
  ok: true,
  sdk_version: SDK_VERSION,
  base_url: baseUrl,
  activation_ms: elapsedMs,
  first_verify: true,
  owner_receipt_lookup: true,
  receipt_signature_valid: true
}, null, 2))
