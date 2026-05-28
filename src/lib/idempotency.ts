import { createHash } from "crypto"

function normalizeJson(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map((item) => normalizeJson(item))
  }

  if (value && typeof value === "object") {
    const entries = Object.entries(value as Record<string, unknown>)
      .filter(([, item]) => item !== undefined)
      .sort(([a], [b]) => a.localeCompare(b))

    return Object.fromEntries(
      entries.map(([key, item]) => [key, normalizeJson(item)])
    )
  }

  return value
}

export function canonicalJson(value: unknown) {
  return JSON.stringify(normalizeJson(value))
}

export function idempotencyRequestHash(value: unknown) {
  return createHash("sha256").update(canonicalJson(value)).digest("hex")
}

export function idempotencyConflict(service: string) {
  return {
    error: "idempotency_key_conflict",
    service,
    hint:
      "Reuse an idempotency key only with the exact same canonical request payload."
  }
}
