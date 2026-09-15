import assert from "node:assert/strict"
import fs from "node:fs"
import path from "node:path"
import { fileURLToPath } from "node:url"

const here = path.dirname(fileURLToPath(import.meta.url))
const root = path.resolve(here, "..")

const readJson = (relativePath) =>
  JSON.parse(fs.readFileSync(path.join(root, relativePath), "utf8"))

const card = readJson("discovery/a2a-card.json")
const service = readJson("discovery/ai-service.json")
const registry = readJson("server.json")

assert.equal(card.name, "InterAI Risk Oracle")
assert.equal(card.version, registry.version)
assert.equal(Object.hasOwn(card, "url"), false, "A2A 1.0 card must use supportedInterfaces")

assert.ok(Array.isArray(card.supportedInterfaces) && card.supportedInterfaces.length > 0)
const primaryInterface = card.supportedInterfaces[0]
assert.equal(primaryInterface.url, "https://api.interailabs.dev/a2a/v1")
assert.equal(primaryInterface.protocolBinding, "JSONRPC")
assert.equal(primaryInterface.protocolVersion, "1.0")

assert.equal(card.documentationUrl, "https://api.interailabs.dev/.well-known/openapi.json")
assert.equal(card.provider?.url, "https://api.interailabs.dev")
assert.equal(card.capabilities?.streaming, false)
assert.equal(card.capabilities?.pushNotifications, false)

assert.ok(card.securitySchemes?.bearerAuth)
assert.ok(Array.isArray(card.securityRequirements) && card.securityRequirements.length > 0)
assert.deepEqual(card.defaultInputModes, ["application/json"])
assert.deepEqual(card.defaultOutputModes, ["application/json"])

const skillIds = new Set((card.skills ?? []).map((skill) => skill.id))
assert.ok(skillIds.has("verify_autonomous_action"))
assert.ok(skillIds.has("verify_batch"))

assert.equal(
  service.endpoints?.a2a_v1_agent_card,
  "https://api.interailabs.dev/.well-known/agent-card.json"
)
assert.equal(registry.remotes?.[0]?.type, "streamable-http")
assert.equal(registry.remotes?.[0]?.url, "https://api.interailabs.dev/mcp")

console.log("Public discovery contract OK")
