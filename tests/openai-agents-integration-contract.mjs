import assert from "node:assert/strict"
import fs from "node:fs"
import path from "node:path"
import { fileURLToPath } from "node:url"

const here = path.dirname(fileURLToPath(import.meta.url))
const root = path.resolve(here, "..")
const source = fs.readFileSync(
  path.join(root, "examples/framework-integrations/openai-agents/example.ts"),
  "utf8"
)
const pkg = JSON.parse(
  fs.readFileSync(
    path.join(root, "examples/framework-integrations/openai-agents/package.json"),
    "utf8"
  )
)

assert.equal(pkg.dependencies["interai-risk-oracle"], "0.1.7-beta")
assert.equal(pkg.dependencies["@openai/agents"], "0.18.0")
assert.match(source, /defineToolInputGuardrail/)
assert.match(source, /inputGuardrails:\s*\[interaiGuardrail\]/)
assert.match(source, /CANONICAL_ACTION_SCHEMA/)
assert.match(source, /HOST_EXECUTION_CONTEXT_SCHEMA/)
assert.match(source, /recommended_action\s*===\s*"allow"/)
assert.match(source, /policy_result\s*===\s*"allow"/)
assert.match(source, /getTrustReceipt\(receiptId\)/)
assert.match(source, /validateAndConsumeReceipt\(/)
assert.match(source, /SqliteReplayStore/)
assert.match(source, /ON CONFLICT\(replay_key\) DO NOTHING/)
assert.match(source, /fail closed/)
assert.doesNotMatch(source, /fetch\(`\$\{INTERAI_BASE_URL\}\/verify/)

const validationOffset = source.indexOf("validateAndConsumeReceipt(")
const providerOffset = source.indexOf("releaseVendorPaymentAtProvider(args)", validationOffset)
assert.ok(validationOffset >= 0 && providerOffset > validationOffset, "authorization validation must precede provider dispatch")

console.log("OpenAI Agents integration contract OK")
