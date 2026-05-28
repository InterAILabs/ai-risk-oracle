const MICROUSDC_PER_USDC = 1_000_000n

export function usdcDecimalToMicrousdc(value: string): number {
  const normalized = value.trim()
  const match = /^(0|[1-9]\d*)(?:\.(\d{1,6}))?$/.exec(normalized)

  if (!match) {
    throw new Error("invalid_usdc_amount")
  }

  const whole = BigInt(match[1])
  const decimal = BigInt((match[2] ?? "").padEnd(6, "0"))
  const microusdc = whole * MICROUSDC_PER_USDC + decimal

  if (microusdc <= 0n || microusdc > BigInt(Number.MAX_SAFE_INTEGER)) {
    throw new Error("invalid_usdc_amount")
  }

  return Number(microusdc)
}

export function microusdcToUsdcString(value: number) {
  if (!Number.isSafeInteger(value) || value < 0) {
    throw new Error("invalid_microusdc_amount")
  }

  const whole = Math.floor(value / 1_000_000)
  const decimal = String(value % 1_000_000).padStart(6, "0")
  return `${whole}.${decimal}`
}
