import { randomUUID } from "node:crypto"
import { DatabaseSync } from "node:sqlite"

import { decodePaymentRequiredHeader } from "@x402/core/http"
import { ExactEvmScheme } from "@x402/evm"
import { wrapFetchWithPaymentFromConfig } from "@x402/fetch"
import {
  CANONICAL_ACTION_SCHEMA,
  HOST_EXECUTION_CONTEXT_SCHEMA,
  InterAIRiskOracleClient,
  type CanonicalActionEnvelope,
  type CanonicalExecutionIntent,
  type ExecutionAuthorizationReplayStore,
  type VerifyResponse
} from "interai-risk-oracle"
import { privateKeyToAccount } from "viem/accounts"

const ORACLE_BASE_URL = process.env.ORACLE_BASE_URL || "https://api.interailabs.dev"
const ORACLE_API_KEY = process.env.ORACLE_API_KEY || ""
const LIVE_X402 = process.env.LIVE_X402 === "true"
const EVM_PRIVATE_KEY = process.env.EVM_PRIVATE_KEY || ""
const REPLAY_DB = process.env.INTERAI_REPLAY_DB || "./interai-x402-replay.sqlite"
const OPERATION_ID = process.env.INTERAI_OPERATION_ID || randomUUID()

const BASE_NETWORK = "eip155:8453"
const BASE_USDC = "0x833589fcd6edb6e08f4c7c32d4f71b54bda02913"
const MAX_PAYMENT_USDC = 0.05
const QUERY = process.env.SEARCH_QUERY || "x402 payment protocol adoption"
const TARGET_URL = `https://agent402.tools/api/search?count=5&q=${encodeURIComponent(QUERY)}`

const interai = new InterAIRiskOracleClient({
  baseUrl: ORACLE_BASE_URL,
  apiKey: ORACLE_API_KEY,
  clientName: "interai-before-x402-proof/0.2.0",
  timeoutMs: 5_000
})

class SqliteReplayStore implements ExecutionAuthorizationReplayStore {
  private readonly db: DatabaseSync

  constructor(filename: string) {
    this.db = new DatabaseSync(filename)
    this.db.exec(
      "PRAGMA busy_timeout=5000; CREATE TABLE IF NOT EXISTS consumed_authorizations (replay_key TEXT PRIMARY KEY)"
    )
  }

  consumeOnce(key: string): boolean {
    const result = this.db
      .prepare("INSERT INTO consumed_authorizations(replay_key) VALUES (?) ON CONFLICT(replay_key) DO NOTHING")
      .run(key)
    return Number(result.changes) === 1
  }

  close() {
    this.db.close()
  }
}

type PaymentBinding = {
  amountUsdc: number
  payTo: string
  asset: string
  network: string
  scheme: string
}

function atomicUsdcToNumber(amount: string) {
  if (!/^\d+$/.test(amount)) throw new Error(`Invalid atomic USDC amount: ${amount}`)
  return Number(BigInt(amount)) / 1_000_000
}

function canonicalX402Action(input: PaymentBinding): CanonicalActionEnvelope {
  return {
    schema: CANONICAL_ACTION_SCHEMA,
    tool_id: "agent402.web_search",
    type: "x402_payment",
    operation: "paid_web_search",
    arguments: {
      method: "GET",
      target_url: TARGET_URL,
      amount_usd: input.amountUsdc,
      currency: "USDC",
      network: input.network,
      asset: input.asset,
      pay_to: input.payTo,
      payment_scheme: input.scheme
    },
    destination: input.payTo,
    resource: TARGET_URL,
    external_side_effect: true,
    irreversible: true
  }
}

function finalIntentFromDecision(
  decision: VerifyResponse,
  finalAction: CanonicalActionEnvelope
): CanonicalExecutionIntent {
  if (!decision.execution_intent) {
    throw new Error("InterAI ALLOW did not include execution_intent")
  }

  return {
    ...structuredClone(decision.execution_intent),
    canonical_action: structuredClone(finalAction)
  }
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

  return { accepted, amountUsdc }
}

async function askInterAI(input: PaymentBinding) {
  if (!ORACLE_API_KEY) {
    throw new Error("Set ORACLE_API_KEY before running the proof")
  }

  return interai.verify(
    {
      use_case: "agent-before-x402-payment",
      action: canonicalX402Action(input),
      execution_context: {
        schema: HOST_EXECUTION_CONTEXT_SCHEMA,
        workspace_id: "interai-x402-proof",
        environment: "production",
        actor_id: "interai-x402-proof",
        run_id: OPERATION_ID
      },
      context: {
        agent_id: "interai-x402-proof",
        environment: "production",
        user_confirmation: true,
        counterparty_id: input.payTo
      },
      policy: {
        require_trust_receipt: true,
        amount_usd_limit: MAX_PAYMENT_USDC,
        allowed_action_types: ["x402_payment"],
        allowed_action_types_enforced: true,
        require_user_confirmation_for_irreversible: true
      },
      authorization_ttl_seconds: 60,
      domain: "agentic-commerce"
    },
    `x402-proof-${OPERATION_ID}`,
    { timeoutMs: 5_000 }
  )
}

async function executePaidRequest(
  accepted: {
    scheme: string
    network: string
    asset: string
    amount: string
    payTo: string
  },
  binding: PaymentBinding,
  decision: VerifyResponse
) {
  if (!LIVE_X402) {
    return {
      executed: false,
      reason: "LIVE_X402 is not true; payment intentionally withheld"
    }
  }

  if (!EVM_PRIVATE_KEY) {
    throw new Error("LIVE_X402=true requires EVM_PRIVATE_KEY")
  }

  const receiptId = decision.trust_receipt_id
  if (!receiptId) throw new Error("Missing InterAI trust receipt; refusing payment")

  const replayStore = new SqliteReplayStore(REPLAY_DB)
  try {
    const finalIntent = finalIntentFromDecision(decision, canonicalX402Action(binding))
    const lookup = await interai.getTrustReceipt(receiptId)
    const gate = await interai.validateAndConsumeReceipt({
      lookup,
      finalIntent,
      replayStore
    })

    if (!gate.ok) {
      throw new Error(`InterAI dispatch denied: ${gate.code}`)
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
          throw new Error(
            `Expected exactly one approved payment requirement, got ${requirements.length}`
          )
        }
        return requirements[0]
      }
    })

    // Nothing may rewrite the payment binding between the gate above and this request.
    const response = await fetchWithPayment(TARGET_URL, { method: "GET" })
    const settlementHeader = response.headers.get("PAYMENT-RESPONSE")
    const data = await response.json()

    if (!response.ok) {
      throw new Error(`Paid resource failed: HTTP ${response.status} ${JSON.stringify(data)}`)
    }

    return {
      executed: true,
      http_status: response.status,
      execution_intent_digest: gate.execution_intent_digest,
      payment_response: settlementHeader,
      data
    }
  } finally {
    replayStore.close()
  }
}

async function main() {
  const { accepted, amountUsdc } = await discoverPaymentRequirement()
  const binding: PaymentBinding = {
    amountUsdc,
    payTo: accepted.payTo,
    asset: accepted.asset,
    network: accepted.network,
    scheme: accepted.scheme
  }

  console.log("1. x402 payment requirement discovered", {
    target: TARGET_URL,
    scheme: accepted.scheme,
    network: accepted.network,
    amount_atomic: accepted.amount,
    amount_usdc: amountUsdc,
    asset: accepted.asset,
    pay_to: accepted.payTo
  })

  const decision = await askInterAI(binding)

  console.log("2. InterAI decision", {
    recommended_action: decision.recommended_action,
    policy_result: decision.policy_result,
    risk_level: decision.risk_level,
    trust_receipt_id: decision.trust_receipt_id,
    execution_intent_digest: decision.execution_intent_digest,
    execution_authorization_present: Boolean(decision.execution_authorization)
  })

  const authorizing =
    decision.recommended_action === "allow" &&
    decision.policy_result === "allow" &&
    Boolean(decision.trust_receipt_id) &&
    Boolean(decision.execution_intent) &&
    Boolean(decision.execution_authorization)

  if (!authorizing) {
    console.log("3. Payment withheld", {
      reason: "InterAI did not return a complete executable ALLOW",
      policy_violations: decision.policy_violations
    })
    return
  }

  const execution = await executePaidRequest(accepted, binding, decision)
  console.log("3. x402 execution", execution)

  console.log("4. Evidence", {
    interai_trust_receipt_id: decision.trust_receipt_id,
    execution_intent_digest: decision.execution_intent_digest,
    settlement_evidence_present:
      execution.executed === true && Boolean(execution.payment_response)
  })
}

main().catch((error) => {
  console.error("INTERAI_BEFORE_X402_PROOF_FAILED")
  console.error(error)
  process.exit(1)
})
