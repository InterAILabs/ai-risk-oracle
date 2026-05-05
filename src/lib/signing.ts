import { createHmac, timingSafeEqual } from "crypto"

export const RECEIPT_SIGNATURE_ALG = "hmac-sha256" as const

function getSigningSecret() {
  const secret = process.env.ORACLE_SIGNING_SECRET

  if (!secret || !secret.trim()) {
    return null
  }

  return secret
}

function stableStringify(value: unknown): string {
  if (value === null || typeof value !== "object") {
    return JSON.stringify(value)
  }

  if (Array.isArray(value)) {
    return `[${value.map((item) => stableStringify(item)).join(",")}]`
  }

  const obj = value as Record<string, unknown>
  const keys = Object.keys(obj).sort()

  return `{${keys
    .map((key) => `${JSON.stringify(key)}:${stableStringify(obj[key])}`)
    .join(",")}}`
}

export function signReceipt(payload: unknown) {
  const secret = getSigningSecret()
  if (!secret) return null
  const canonical = stableStringify(payload)

  return createHmac("sha256", secret).update(canonical).digest("hex")
}

export function isReceiptSigningEnabled() {
  return getSigningSecret() !== null
}

export function verifyReceiptSignature(input: {
  payload: unknown
  signature: string
}) {
  const expected = signReceipt(input.payload)
  if (!expected) return false

  const expectedBuffer = Buffer.from(expected, "hex")
  const providedBuffer = Buffer.from(input.signature, "hex")

  if (expectedBuffer.length !== providedBuffer.length) {
    return false
  }

  return timingSafeEqual(expectedBuffer, providedBuffer)
}
