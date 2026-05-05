export type Signals = {
  semantic_relevance: number
  contradiction_risk: number
  unsupported_specificity: number
  numeric_consistency: number
  overconfidence: number
}

function clamp(n: number) {
  return Math.max(0, Math.min(1, n))
}

export function computeSignals(prompt: string, response: string): Signals {
  const p = prompt.toLowerCase()
  const r = response.toLowerCase()

  const pWords = p.split(/\W+/).filter(Boolean)
  const rWords = r.split(/\W+/).filter(Boolean)

  const overlap = pWords.filter((w) => rWords.includes(w)).length
  const semantic_relevance = clamp(overlap / (pWords.length || 1))

  const contradictionMarkers = ["but", "however", "although", "on the other hand"]
  const contradiction_risk = clamp(
    contradictionMarkers.some((m) => r.includes(m)) ? 0.4 : 0.1
  )

  const numbers = r.match(/\d+/g) || []
  const unsupported_specificity = clamp(numbers.length > 2 ? 0.7 : 0.2)

  const numeric_consistency = clamp(numbers.length > 0 ? 0.8 : 0.5)

  const confidentWords = ["always", "never", "guaranteed", "definitely", "proven"]
  const overconfidence = clamp(
    confidentWords.some((w) => r.includes(w)) ? 0.8 : 0.3
  )

  return {
    semantic_relevance,
    contradiction_risk,
    unsupported_specificity,
    numeric_consistency,
    overconfidence
  }
}