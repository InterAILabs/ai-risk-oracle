// src/config/pricing.ts
export const PRICING = {
  fast: {
    amount: "0.0006" as string,
    usdc_decimals: 6
  },
  batch: {
    base_amount: 0.0006,
    per_item_amount: 0.0002,
    max_items: 100,
    usdc_decimals: 6
  }
} as const

export function getBatchAmount(itemsCount: number): string {
  const safeCount = Math.max(1, Math.floor(itemsCount))
  const total = PRICING.batch.base_amount + safeCount * PRICING.batch.per_item_amount
  return total.toFixed(6)
}