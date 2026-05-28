import assert from "node:assert/strict"

function isEnabled(value, fallback = "false") {
  return ["true", "1", "yes", "on"].includes(String(value ?? fallback).toLowerCase())
}

function requiredNumber(name) {
  const raw = process.env[name]
  check(raw !== undefined && raw !== "", `${name} is explicitly configured`)
  const value = Number(raw)
  check(Number.isFinite(value), `${name} is numeric`)
  return value
}

function check(condition, message) {
  assert.ok(condition, message)
  console.log(`[OK] ${message}`)
}

function main() {
  const paymentMode = String(process.env.PAYMENT_MODE || "")
  const topupAddress = String(process.env.TOPUP_RECEIVE_ADDRESS || "")
  const baseRpcUrl = String(process.env.BASE_RPC_URL || "")
  const adminToken = String(process.env.ADMIN_TOKEN || "")
  const signingSecret = String(process.env.ORACLE_SIGNING_SECRET || "")
  const x402PayTo = String(process.env.X402_PAY_TO || "")
  const x402FacilitatorUrl = String(process.env.X402_FACILITATOR_URL || "")
  const trialCreditEnabled = process.env.ONBOARDING_TRIAL_CREDIT_ENABLED

  check(paymentMode === "onchain", "PAYMENT_MODE is onchain")
  check(/^0x[a-fA-F0-9]{40}$/.test(topupAddress), "TOPUP_RECEIVE_ADDRESS looks like an EVM address")
  check(/^https:\/\//.test(baseRpcUrl), "BASE_RPC_URL uses https")
  check(adminToken.length >= 24 && adminToken !== "change-me", "ADMIN_TOKEN is non-default")
  check(signingSecret.length >= 32, "ORACLE_SIGNING_SECRET is configured")
  if (x402PayTo) {
    check(/^0x[a-fA-F0-9]{40}$/.test(x402PayTo), "X402_PAY_TO looks like an EVM address")
  }
  if (x402FacilitatorUrl) {
    check(/^https:\/\//.test(x402FacilitatorUrl), "X402_FACILITATOR_URL uses https")
  }
  check(!isEnabled(process.env.DEV_TOPUP_ENABLED), "DEV_TOPUP_ENABLED is disabled")
  check(!isEnabled(process.env.ALLOW_FAKE_TOPUP_CONFIRM), "ALLOW_FAKE_TOPUP_CONFIRM is disabled")
  check(
    !isEnabled(process.env.ONBOARDING_DEV_AUTO_CREDIT_ENABLED),
    "ONBOARDING_DEV_AUTO_CREDIT_ENABLED is disabled"
  )
  check(
    ["true", "false"].includes(String(trialCreditEnabled ?? "").toLowerCase()),
    "ONBOARDING_TRIAL_CREDIT_ENABLED is explicitly true or false"
  )

  const bodyLimitBytes = requiredNumber("BODY_LIMIT_BYTES")
  check(
    bodyLimitBytes >= 1_000 && bodyLimitBytes <= 1_000_000,
    "BODY_LIMIT_BYTES is within production bounds"
  )

  const requestTimeoutMs = requiredNumber("REQUEST_TIMEOUT_MS")
  check(
    requestTimeoutMs >= 1_000 && requestTimeoutMs <= 30_000,
    "REQUEST_TIMEOUT_MS is within production bounds"
  )

  const rateLimitCapacity = requiredNumber("RL_CAPACITY")
  check(
    Number.isInteger(rateLimitCapacity) && rateLimitCapacity >= 1 && rateLimitCapacity <= 10_000,
    "RL_CAPACITY is within production bounds"
  )

  const rateLimitRefill = requiredNumber("RL_REFILL_PER_SEC")
  check(
    rateLimitRefill > 0 && rateLimitRefill <= 1_000,
    "RL_REFILL_PER_SEC is within production bounds"
  )

  console.log("PRODUCTION CONFIG CHECK OK")
}

main()
