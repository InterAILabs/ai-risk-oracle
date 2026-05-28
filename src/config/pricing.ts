// src/config/pricing.ts
import {
  microusdcToUsdcString,
  usdcDecimalToMicrousdc
} from "../lib/money.js"

export const PRICING = {
  fast: {
    amount: "0.0006" as string,
    usdc_decimals: 6
  },
  semantic_judge: {
    amount: "0.0030" as string,
    usdc_decimals: 6
  },
  batch: {
    base_amount: "0.000600" as string,
    per_item_amount: "0.000200" as string,
    max_items: 100,
    usdc_decimals: 6
  }
} as const

export type VerificationMode = "fast_heuristic" | "semantic_judge"

export function normalizeVerificationMode(value: unknown): VerificationMode {
  if (value === "semantic_judge") return "semantic_judge"
  return "fast_heuristic"
}

export function getVerifyAmount(mode: VerificationMode = "fast_heuristic"): string {
  return mode === "semantic_judge" ? PRICING.semantic_judge.amount : PRICING.fast.amount
}

export function getBatchAmount(itemsCount: number): string {
  const safeCount = Math.max(1, Math.floor(itemsCount))
  const total =
    usdcDecimalToMicrousdc(PRICING.batch.base_amount) +
    safeCount * usdcDecimalToMicrousdc(PRICING.batch.per_item_amount)
  return microusdcToUsdcString(total)
}
