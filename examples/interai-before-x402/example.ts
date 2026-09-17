import { decodePaymentRequiredHeader } from "@x402/core/http"
import { ExactEvmScheme } from "@x402/evm"
import { wrapFetchWithPaymentFromConfig } from "@x402/fetch"
import { privateKeyToAccount } from "viem/accounts"

const ORACLE_BASE_URL = process.env.ORACLE_BASE_URL || "https://ai-risk-oracle.fly.dev"
const ORACLE_API_KEY = process.env.ORACLE_API_KEY || ""
const LIVE_X402 = process.env.LIVE_X402 === "true"
const EVM_PRIVATE_KEY = process.env.EVM_PRIVATE_KEY || ""

const BASE_NETWORK = "eip155:8453"
const BASE_USDC = "0x833589fcd6edb6e08f4c7c32d4f71b54bda02913"
const MAX_PAYMENT_USDC = 0.05
const QUERY = process.env.SEARCH_QUERY || "x402 payment protocol adoption"
const TARGET_URL = `https://agent402.tools/api/search?count=5&q=${encodeURIComponent(QUERY)}`

type JsonRecord = Record<string, unknown>

function asRecord(value: unknown): JsonRecord {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error("Expected a JSON object")
  }
  return value as JsonRecord
}

function atomicUsdcToNumber(amount: string) {
  if (!/^\d+$/.test(amount)) throw new Error(`Invalid atomic USDC amount: ${amount}`)
  return Number(BigInt(amount)) / 1_000_000
}

async function discoverPaymentRequirement() {
  const response = await fetch(TARGET_URL, { method: "GET" })
  if (response.status !== 402) {
    throw new Error(`Expected HTTP 402 from x402 resource, received ${response.status}`)
  }

  const header = response.headers.get("PAYMENT-REQUIRED")
  if (!header) throw new Error("x402 resource did not return PAYMENT-REQUIRED")

  const paymentRequired = decodePaymentRequiredHeader(header)
  const accepted = paymentRequired.accepts.find(
    (item) =>
      item.scheme === "exact" &&
      item.network === BASE_NETWORK &&
      item.asset.toLowerCase() === BASE_USDC
  )

  if (!accepted) {
    throw new Error("No exact Base-mainnet USDC payment requirement was offered")
  }

  const amountUsdc = atomicUsdcToNumber(accepted.amount)
  if (amountUsdc <= 0 || amountUsdc > MAX_PAYMENT_USDC) {
    throw new Error(
      `Payment requirement ${amountUsdc} USDC exceeds local cap ${MAX_PAYMENT_USDC} USDC`
    )
  }

  return { paymentRequired, accepted, amountUsdc }
}

async function askInterAI(input: {
  amountUsdc: number
  payTo: string
  asset: string
  network: string
  scheme: string
}) {
  if (!ORACLE_API_KEY) {
    throw new Error("Set ORACLE_API_KEY before running the proof")
  }

  const idempotencyKey = `x402-search-${Buffer.from(TARGET_URL).toString("base64url").slice(0, 40)}`
  const response = await fetch(`${ORACLE_BASE_URL}/verify`, {
    method: "POST",
    headers: {
      authorization: `Bearer ${ORACLE_API_KEY}`,
      "content-type": "application/json",
      "x-idempotency-key": idempotencyKey
    },
    body: JSON.stringify({
      use_case: "agent-before-x402-payment",
      action: {
        type: "x402_payment",
        name: "paid_web_search",
        description: "Pay an x402-gated API for one live web-search request",
        method: "GET",
        target_url: TARGET_URL,
        amount_usd: input.amountUsdc,
        currency: "USDC",
        network: input.network,
        asset: input.asset,
        pay_to: input.payTo,
        payment_scheme: input.scheme,
        irreversible: true,
        external_side_effect: true
      },
      context: {
        agent_id: "interai-x402-proof",
        environment: "production",
        user_confirmation: true,
        counterparty_id: input.payTo
      },
      policy: {
        max_risk_level: "medium",
        require_trust_receipt: true,
        amount_usd_limit: MAX_PAYMENT_USDC,
        allowed_action_types: ["x402_payment"],
        require_user_confirmation_for_irreversible: true
      },
      domain: "agentic-commerce"
    })
  })

  const body = asRecord(await response.json())
  if (!response.ok) {
    throw new Error(`InterAI verification failed: HTTP ${response.status} ${JSON.stringify(body)}`)
  }

  return body
}

async function executePaidRequest(accepted: {
  scheme: string
  network: string
  asset: string
  amount: string
  payTo: string
}) {
  if (!LIVE_X402) {
    return {
      executed: false,
      reason: "LIVE_X402 is not true; payment intentionally withheld"
    }
  }

  if (!EVM_PRIVATE_KEY) {
    throw new Error("LIVE_X402=true requires EVM_PRIVATE_KEY")
  }

  const account = privateKeyToAccount(EVM_PRIVATE_KEY as `0x${string}`)
  const fetchWithPayment = wrapFetchWithPaymentFromConfig(fetch, {
    schemes: [
      {
        network: BASE_NETWORK,
        client: new ExactEvmScheme(account)
      }
    ],
    spendControls: {
      maxAmountPerPayment: `$${MAX_PAYMENT_USDC}`
    },
    policies: [
      (_version, requirements) =>
        requirements.filter(
          (item) =>
            item.scheme === accepted.scheme &&
            item.network === accepted.network &&
            item.asset.toLowerCase() === accepted.asset.toLowerCase() &&
            item.amount === accepted.amount &&
            item.payTo.toLowerCase() === accepted.payTo.toLowerCase()
        )
    ],
    paymentRequirementsSelector: (_version, requirements) => {
      if (requirements.length !== 1) {
        throw new Error(`Expected exactly one approved payment requirement, got ${requirements.length}`)
      }
      return requirements[0]
    }
  })

  const response = await fetchWithPayment(TARGET_URL, { method: "GET" })
  const settlementHeader = response.headers.get("PAYMENT-RESPONSE")
  const data = await response.json()

  if (!response.ok) {
    throw new Error(`Paid resource failed: HTTP ${response.status} ${JSON.stringify(data)}`)
  }

  return {
    executed: true,
    http_status: response.status,
    payment_response: settlementHeader,
    data
  }
}

async function main() {
  const { accepted, amountUsdc } = await discoverPaymentRequirement()

  console.log("1. x402 payment requirement discovered", {
    target: TARGET_URL,
    scheme: accepted.scheme,
    network: accepted.network,
    amount_atomic: accepted.amount,
    amount_usdc: amountUsdc,
    asset: accepted.asset,
    pay_to: accepted.payTo
  })

  const decision = await askInterAI({
    amountUsdc,
    payTo: accepted.payTo,
    asset: accepted.asset,
    network: accepted.network,
    scheme: accepted.scheme
  })

  console.log("2. InterAI decision", {
    recommended_action: decision.recommended_action,
    policy_result: decision.policy_result,
    risk_level: decision.risk_level,
    trust_receipt_id: decision.trust_receipt_id
  })

  const approved =
    decision.recommended_action === "allow" && decision.policy_result === "allow"

  if (!approved) {
    console.log("3. Payment withheld", {
      reason: "InterAI did not return ALLOW + policy ALLOW",
      policy_violations: decision.policy_violations
    })
    return
  }

  const execution = await executePaidRequest(accepted)
  console.log("3. x402 execution", execution)

  console.log("4. Evidence", {
    interai_trust_receipt_id: decision.trust_receipt_id,
    settlement_evidence_present:
      execution.executed === true && Boolean(execution.payment_response)
  })
}

main().catch((error) => {
  console.error("INTERAI_BEFORE_X402_PROOF_FAILED")
  console.error(error)
  process.exit(1)
})
