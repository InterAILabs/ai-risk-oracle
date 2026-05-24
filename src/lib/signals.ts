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
  let semantic_relevance = clamp(overlap / (pWords.length || 1))

  const contradictionMarkers = ["but", "however", "although", "on the other hand"]
  let contradiction_risk = clamp(
    contradictionMarkers.some((m) => r.includes(m)) ? 0.4 : 0.1
  )

  const promptNumbers: string[] = p.match(/\d+/g) ?? []
  const numbers: string[] = r.match(/\d+/g) ?? []
  let unsupported_specificity = clamp(numbers.length > 2 ? 0.7 : 0.2)

  let numeric_consistency = clamp(numbers.length > 0 ? 0.8 : 0.5)

  const confidentWords = ["always", "never", "guaranteed", "definitely", "proven"]
  let overconfidence = clamp(
    confidentWords.some((w) => r.includes(w)) ? 0.8 : 0.3
  )

  const addition = p.match(/(\d+)\s*\+\s*(\d+)/)
  if (addition && numbers.length > 0) {
    const expected = String(Number(addition[1]) + Number(addition[2]))
    if (numbers.includes(expected)) {
      semantic_relevance = Math.max(semantic_relevance, 0.9)
      numeric_consistency = 1
      unsupported_specificity = Math.min(unsupported_specificity, 0.1)
      contradiction_risk = Math.min(contradiction_risk, 0.05)
    } else {
      numeric_consistency = 0.05
      contradiction_risk = 0.8
      unsupported_specificity = Math.max(unsupported_specificity, 0.7)
    }
  }

  const cautiousProcedure =
    ["confirm", "check", "match", "review"].filter((word) => r.includes(word))
      .length >= 2
  if (cautiousProcedure && promptNumbers.length === 0) {
    semantic_relevance = Math.max(semantic_relevance, 0.65)
    overconfidence = Math.min(overconfidence, 0.15)
  }

  return {
    semantic_relevance,
    contradiction_risk,
    unsupported_specificity,
    numeric_consistency,
    overconfidence
  }
}
