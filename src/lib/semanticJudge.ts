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
  provider: "local"
  semantic_alignment: number
  support_score: number
  caution_score: number
  judge_score: number
  risk_delta: number
  judge_risk_factors: string[]
  judge_notes: string[]
  judge_recommended_action: "accept" | "review" | "reject"
  checks: string[]
}

function includesAny(value: string, terms: string[]) {
  return terms.some((term) => value.includes(term))
}

function countMatches(value: string, pattern: RegExp) {
  return value.match(pattern)?.length ?? 0
}

function addUnique(list: string[], value: string) {
  if (!list.includes(value)) list.push(value)
}

function hasEvidenceMarker(value: string) {
  return includesAny(value, [
    "http://",
    "https://",
    "according to",
    "citation",
    "cited",
    "evidence",
    "in the provided",
    "source",
    "sources"
  ])
}

export function runSemanticJudge(input: {
  prompt: string
  response: string
  domain?: string
  signals: Signals
}): { signals: Signals; semantic_judge: SemanticJudgeResult } {
  const promptWords = words(input.prompt)
  const responseWords = words(input.response)
  const prompt = input.prompt.toLowerCase()
  const response = input.response.toLowerCase()
  const domain = (input.domain ?? "general").toLowerCase()
  const semanticAlignment = clamp(
    (uniqueOverlap(promptWords, responseWords) + input.signals.semantic_relevance) / 2
  )

  const cautionWords = [
    "verify",
    "check",
    "review",
    "confirm",
    "source",
    "evidence",
    "human",
    "manual",
    "escalate"
  ]
  const riskyWords = [
    "always",
    "never",
    "guaranteed",
    "immediately",
    "ignore",
    "trust every",
    "without checking",
    "without review"
  ]
  const cautionScore = clamp(
    cautionWords.filter((word) => response.includes(word)).length / 3
  )
  const riskyLanguage = riskyWords.some((word) => response.includes(word))
  const specificNumberCount =
    countMatches(response, /\b\d+(?:[.,]\d+)?(?:\s?(?:%|percent|usd|usdc|bps|x))?\b/g) +
    countMatches(response, /\b20\d{2}-\d{2}-\d{2}\b/g)
  const promptNumberCount = countMatches(prompt, /\b\d+(?:[.,]\d+)?\b/g)
  const hasEvidence = hasEvidenceMarker(response)

  const riskFactors: string[] = []
  const notes: string[] = []

  const highStakesDomain = includesAny(`${domain} ${prompt} ${response}`, [
    "clinical",
    "contract",
    "crypto",
    "diagnosis",
    "dose",
    "escrow",
    "finance",
    "financial",
    "investment",
    "jurisdiction",
    "lawsuit",
    "legal",
    "medical",
    "patient",
    "payment",
    "security",
    "tax",
    "trading",
    "wire"
  ])
  const impossibleCertainty = includesAny(response, [
    "100%",
    "absolutely certain",
    "cannot fail",
    "definitely",
    "guaranteed",
    "no risk",
    "risk-free",
    "will always",
    "will never"
  ])
  const missingContextRequired = includesAny(prompt, [
    "current",
    "latest",
    "recent",
    "right now",
    "today",
    "this week",
    "up to date"
  ]) && !includesAny(response, ["cannot verify", "need to check", "needs review", "source"])
  const instructionConflict = includesAny(`${prompt} ${response}`, [
    "bypass",
    "disable safety",
    "ignore previous",
    "ignore the policy",
    "override instructions",
    "reveal secret",
    "skip validation"
  ])
  const toolActionRisk = includesAny(response, [
    "curl | sh",
    "delete the database",
    "deploy immediately",
    "drop table",
    "execute the command",
    "rm -rf",
    "run sudo",
    "ship it without"
  ])
  const paymentActionRisk = includesAny(response, [
    "approve the charge",
    "pay immediately",
    "release escrow",
    "release payment",
    "send usdc",
    "settle payment",
    "transfer funds",
    "wire the money"
  ])
  const medicalOrLegalDirectiveRisk = includesAny(response, [
    "ignore your doctor",
    "sign the contract",
    "skip a lawyer",
    "stop taking",
    "sue immediately",
    "take this dose",
    "you do not need a lawyer"
  ]) || (
    highStakesDomain &&
    includesAny(response, ["must take", "must sign", "should take", "should sign"])
  )
  const unsupportedSpecificNumbers =
    specificNumberCount > promptNumberCount + 1 && !hasEvidence
  const sourceAbsentButClaimSpecific =
    !hasEvidence &&
    (unsupportedSpecificNumbers ||
      includesAny(response, ["study shows", "data proves", "market will", "law requires"]))

  if (unsupportedSpecificNumbers) {
    addUnique(riskFactors, "unsupported_specific_numbers")
    notes.push("Response adds specific numeric claims without visible support.")
  }
  if (impossibleCertainty) {
    addUnique(riskFactors, "impossible_certainty")
    notes.push("Response uses certainty that is hard to justify from the prompt alone.")
  }
  if (missingContextRequired) {
    addUnique(riskFactors, "missing_context_required")
    notes.push("Prompt asks for current or recent context, but response does not request verification.")
  }
  if (highStakesDomain) {
    addUnique(riskFactors, "high_stakes_domain")
    notes.push("Prompt or response touches a domain where review cost is lower than action risk.")
  }
  if (instructionConflict) {
    addUnique(riskFactors, "instruction_conflict")
    notes.push("Content contains instruction-conflict or policy-bypass language.")
  }
  if (toolActionRisk) {
    addUnique(riskFactors, "tool_action_risk")
    notes.push("Response could trigger a destructive or operational tool action.")
  }
  if (paymentActionRisk) {
    addUnique(riskFactors, "payment_action_risk")
    notes.push("Response could release or move funds before independent verification.")
  }
  if (medicalOrLegalDirectiveRisk) {
    addUnique(riskFactors, "medical_or_legal_directive_risk")
    notes.push("Response gives direct medical or legal action language.")
  }
  if (sourceAbsentButClaimSpecific) {
    addUnique(riskFactors, "source_absent_but_claim_specific")
    notes.push("Response makes source-sensitive claims without citations or evidence markers.")
  }

  const highSeverityFactorCount = riskFactors.filter((factor) =>
    [
      "instruction_conflict",
      "tool_action_risk",
      "payment_action_risk",
      "medical_or_legal_directive_risk"
    ].includes(factor)
  ).length
  const riskPenalty = clamp(
    riskFactors.length * 0.07 +
      highSeverityFactorCount * 0.11 +
      (riskyLanguage ? 0.08 : 0)
  )
  const supportScore = clamp(
    semanticAlignment * 0.55 +
      input.signals.numeric_consistency * 0.25 +
      cautionScore * 0.2 -
      (riskyLanguage ? 0.25 : 0)
  )
  const judgeScore = clamp(supportScore - riskPenalty + (hasEvidence ? 0.06 : 0))
  const riskDelta = clamp(0.35 - judgeScore + riskPenalty * 0.5)
  const judgeRecommendedAction =
    judgeScore >= 0.68 && riskFactors.length === 0
      ? "accept"
      : judgeScore < 0.32 || highSeverityFactorCount >= 2
        ? "reject"
        : "review"

  const adjusted: Signals = {
    ...input.signals,
    semantic_relevance: Math.max(input.signals.semantic_relevance, semanticAlignment),
    unsupported_specificity: clamp(
      input.signals.unsupported_specificity +
        (judgeScore < 0.45 ? 0.18 : -0.08) +
        Math.min(riskFactors.length * 0.04, 0.18)
    ),
    contradiction_risk: clamp(
      input.signals.contradiction_risk +
        (riskyLanguage && judgeScore < 0.5 ? 0.18 : 0) +
        (instructionConflict ? 0.16 : 0)
    ),
    overconfidence: clamp(
      input.signals.overconfidence +
        (riskyLanguage && cautionScore < 0.35 ? 0.12 : -0.05) +
        (impossibleCertainty ? 0.12 : 0)
    )
  }

  if (notes.length === 0) {
    notes.push("No semantic judge risk factor crossed the local deterministic threshold.")
  }

  return {
    signals: adjusted,
    semantic_judge: {
      judge_version: "semantic-judge-v1",
      mode: "semantic_judge",
      provider: "local",
      semantic_alignment: Number(semanticAlignment.toFixed(4)),
      support_score: Number(supportScore.toFixed(4)),
      caution_score: Number(cautionScore.toFixed(4)),
      judge_score: Number(judgeScore.toFixed(4)),
      risk_delta: Number(riskDelta.toFixed(4)),
      judge_risk_factors: riskFactors,
      judge_notes: notes,
      judge_recommended_action: judgeRecommendedAction,
      checks: [
        "semantic_alignment",
        "support_score",
        "caution_language",
        "risky_language",
        "unsupported_specific_numbers",
        "impossible_certainty",
        "missing_context_required",
        "high_stakes_domain",
        "instruction_conflict",
        "tool_action_risk",
        "payment_action_risk",
        "medical_or_legal_directive_risk",
        "source_absent_but_claim_specific"
      ]
    }
  }
}
