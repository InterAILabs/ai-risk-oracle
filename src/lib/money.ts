export function microusdcToUsdcString(value: number) {
  return (value / 1_000_000).toFixed(6)
}