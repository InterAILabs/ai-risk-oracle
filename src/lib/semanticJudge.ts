import type { Signals } from "./signals.js"

function clamp(n: number) {
  return Math.max(0, Math.min(1, n))
}

function words(value: string) {
  return value.toLowerCase().split(/\W+/).filter((word) => word.length > 2)
}

function uniqueOverlap(a: string[], b: string[]) {
  const right = new Set(b)
  const left = Array.from(new Set(a))
  if (left.length === 0) return 0
  return left.filter((word) => right.has(word)).length / left.length
}

export type SemanticJudgeResult = {
  judge_version: "semantic-judge-v1"
  mode: "semantic_judge"
  semantic_alignment: number
  support_score: number
  caution_score: number
  risk_delta: number
  checks: string[]
}

export function runSemanticJudge(input: {
  prompt: string
  response: string
  signals: Signals
}): { signals: Signals; semantic_judge: SemanticJudgeResult } {
  const promptWords = words(input.prompt)
  const responseWords = words(input.response)
  const semanticAlignment = clamp(
    (uniqueOverlap(promptWords, responseWords) + input.signals.semantic_relevance) / 2
  )

  const cautionWords = ["verify", "check", "review", "confirm", "source", "evidence"]
  const riskyWords = ["always", "never", "guaranteed", "immediately", "ignore", "trust every"]
  const cautionScore = clamp(
    cautionWords.filter((word) => input.response.toLowerCase().includes(word)).length / 3
  )
  const riskyLanguage = riskyWords.some((word) => input.response.toLowerCase().includes(word))
  const supportScore = clamp(
    semanticAlignment * 0.55 +
      input.signals.numeric_consistency * 0.25 +
      cautionScore * 0.2 -
      (riskyLanguage ? 0.25 : 0)
  )
  const riskDelta = clamp(0.35 - supportScore)

  const adjusted: Signals = {
    ...input.signals,
    semantic_relevance: Math.max(input.signals.semantic_relevance, semanticAlignment),
    unsupported_specificity: clamp(
      input.signals.unsupported_specificity + (supportScore < 0.45 ? 0.18 : -0.08)
    ),
    contradiction_risk: clamp(
      input.signals.contradiction_risk + (riskyLanguage && supportScore < 0.5 ? 0.18 : 0)
    ),
    overconfidence: clamp(
      input.signals.overconfidence + (riskyLanguage && cautionScore < 0.35 ? 0.12 : -0.05)
    )
  }

  return {
    signals: adjusted,
    semantic_judge: {
      judge_version: "semantic-judge-v1",
      mode: "semantic_judge",
      semantic_alignment: Number(semanticAlignment.toFixed(4)),
      support_score: Number(supportScore.toFixed(4)),
      caution_score: Number(cautionScore.toFixed(4)),
      risk_delta: Number(riskDelta.toFixed(4)),
      checks: [
        "semantic_alignment",
        "support_score",
        "caution_language",
        "risky_language"
      ]
    }
  }
}
