import { getBatchAmount, PRICING } from "../config/pricing.js"

export function isEnabled(value: string | undefined, fallback = "false") {
  const normalized = String(value ?? fallback).toLowerCase()
  return ["true", "1", "yes", "on"].includes(normalized)
}

export function getTrialOffer() {
  const enabled = isEnabled(process.env.ONBOARDING_TRIAL_CREDIT_ENABLED, "false")
  const amountUsdc = String(process.env.ONBOARDING_TRIAL_CREDIT_USDC ?? "0.003")
  const amountMicrousdc = Math.max(0, Math.round(Number(amountUsdc) * 1_000_000))
  const verifyCostMicrousdc = Math.round(Number(PRICING.fast.amount) * 1_000_000)
  const estimatedVerifyCalls =
    verifyCostMicrousdc > 0
      ? Math.floor(amountMicrousdc / verifyCostMicrousdc)
      : 0

  return {
    enabled,
    amount_usdc: amountUsdc,
    amount_microusdc: amountMicrousdc,
    estimated_verify_calls: estimatedVerifyCalls
  }
}

export function buildPublicPricing(baseUrl: string) {
  return {
    model: "prepaid_balance_per_request",
    currency: "USDC",
    chain: "base",
    unit: "microusdc",
    auth: {
      type: "bearer_api_key",
      onboarding_url: `${baseUrl}/onboard`
    },
    verify: {
      service: "verify",
      cost_usdc: PRICING.fast.amount,
      cost_microusdc: Math.round(Number(PRICING.fast.amount) * 1_000_000)
    },
    verify_batch: {
      service: "verify_batch",
      pricing_model: "base_plus_per_item",
      base_cost_usdc: PRICING.batch.base_amount.toFixed(6),
      per_item_cost_usdc: PRICING.batch.per_item_amount.toFixed(6),
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
