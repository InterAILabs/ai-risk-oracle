import { getBatchAmount, PRICING } from "../config/pricing.js"
import { usdcDecimalToMicrousdc } from "./money.js"
import { buildX402Accept } from "./x402.js"

export function isEnabled(value: string | undefined, fallback = "false") {
  const normalized = String(value ?? fallback).toLowerCase()
  return ["true", "1", "yes", "on"].includes(normalized)
}

export function getTrialOffer() {
  const enabled = isEnabled(process.env.ONBOARDING_TRIAL_CREDIT_ENABLED, "false")
  const amountUsdc = String(process.env.ONBOARDING_TRIAL_CREDIT_USDC ?? "0.003")
  let amountMicrousdc = 0
  if (enabled) {
    try {
      amountMicrousdc = usdcDecimalToMicrousdc(amountUsdc)
    } catch {
      amountMicrousdc = 0
    }
  }
  const verifyCostMicrousdc = usdcDecimalToMicrousdc(PRICING.fast.amount)
  const semanticJudgeCostMicrousdc = usdcDecimalToMicrousdc(
    PRICING.semantic_judge.amount
  )
  const estimatedVerifyCalls =
    verifyCostMicrousdc > 0
      ? Math.floor(amountMicrousdc / verifyCostMicrousdc)
      : 0
  const estimatedSemanticJudgeCalls =
    semanticJudgeCostMicrousdc > 0
      ? Math.floor(amountMicrousdc / semanticJudgeCostMicrousdc)
      : 0

  return {
    enabled,
    amount_usdc: amountUsdc,
    amount_microusdc: amountMicrousdc,
    estimated_verify_calls: estimatedVerifyCalls,
    estimated_calls_by_mode: {
      fast_heuristic: estimatedVerifyCalls,
      semantic_judge: estimatedSemanticJudgeCalls
    }
  }
}

export function buildPublicPricing(baseUrl: string) {
  const verifyAccept = buildX402Accept({
    service: "verify",
    amountUsdc: PRICING.fast.amount
  })
  const semanticJudgeAccept = buildX402Accept({
    service: "verify",
    amountUsdc: PRICING.semantic_judge.amount
  })
  const batchAccept = buildX402Accept({
    service: "verify_batch",
    amountUsdc: getBatchAmount(1)
  })

  return {
    model: "prepaid_balance_per_request",
    currency: "USDC",
    chain: "base",
    unit: "microusdc",
    protocols: {
      primary: "bearer_prepaid_balance",
      x402: {
        status: "verify_and_settle_supported",
        payment_required_header: "PAYMENT-REQUIRED",
        payment_signature_header: "PAYMENT-SIGNATURE",
        payment_response_header: "PAYMENT-RESPONSE",
        facilitator_url:
          process.env.X402_FACILITATOR_URL || "https://x402.org/facilitator",
        resources: {
          verify: `${baseUrl}/verify`,
          verify_batch: `${baseUrl}/verify/batch`
        },
        accepts: [verifyAccept, semanticJudgeAccept, batchAccept]
      }
    },
    auth: {
      type: "bearer_api_key",
      onboarding_url: `${baseUrl}/onboard`
    },
    verify: {
      service: "verify",
      default_mode: "fast_heuristic",
      modes: {
        fast_heuristic: {
          cost_usdc: PRICING.fast.amount,
          cost_microusdc: usdcDecimalToMicrousdc(PRICING.fast.amount),
          description: "Fast deterministic trust signals for high-volume gating."
        },
        semantic_judge: {
          cost_usdc: PRICING.semantic_judge.amount,
          cost_microusdc: usdcDecimalToMicrousdc(PRICING.semantic_judge.amount),
          description:
            "Deeper deterministic semantic judge pass with support, caution, and risky-language checks."
        }
      },
      cost_usdc: PRICING.fast.amount,
      cost_microusdc: usdcDecimalToMicrousdc(PRICING.fast.amount)
    },
    verify_batch: {
      service: "verify_batch",
      pricing_model: "base_plus_per_item",
      base_cost_usdc: PRICING.batch.base_amount,
      per_item_cost_usdc: PRICING.batch.per_item_amount,
      max_items: PRICING.batch.max_items,
      example_2_items_cost_usdc: getBatchAmount(2),
      example_10_items_cost_usdc: getBatchAmount(10)
    },
    topup: {
      payment_mode: process.env.PAYMENT_MODE || "file",
      create_url: `${baseUrl}/topup/create`,
      confirm_url: `${baseUrl}/topup/confirm`,
      status_url_template: `${baseUrl}/topup/{topupId}`,
      receive_address: process.env.TOPUP_RECEIVE_ADDRESS || null,
      recommended_topup_usdc:
        process.env.DEFAULT_RECOMMENDED_TOPUP_USDC || "0.01"
    },
    trial: getTrialOffer(),
    idempotency: {
      header: "X-Idempotency-Key",
      applies_to: ["/verify", "/verify/batch", "/a2a", "/mcp"]
    }
  }
}
