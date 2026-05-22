import type { Signals } from "./signals.js"

export function computeTrust(signals: Signals) {
  const weights = {
    semantic_relevance: 0.38,
    contradiction_risk: -0.25,
    unsupported_specificity: -0.35,
    numeric_consistency: 0.26,
    overconfidence: -0.22
  }

  const rawScore =
    0.35 +
    signals.semantic_relevance * weights.semantic_relevance +
    signals.contradiction_risk * weights.contradiction_risk +
    signals.unsupported_specificity * weights.unsupported_specificity +
    signals.numeric_consistency * weights.numeric_consistency +
    signals.overconfidence * weights.overconfidence

  const trust_score = Math.max(0, Math.min(1, rawScore))

  let risk_level: "low" | "medium" | "high" = "medium"

  if (trust_score >= 0.6) risk_level = "low"
  else if (trust_score < 0.25) risk_level = "high"

  const recommended_action =
    risk_level === "low"
      ? "accept"
      : risk_level === "medium"
        ? "review"
        : "reject"

  return {
    trust_score,
    risk_level,
    recommended_action
  }
}
