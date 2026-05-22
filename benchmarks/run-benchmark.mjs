import cases from "./cases.json" with { type: "json" }
import { scoreResponse } from "../dist/engine/score.js"
import { computeSignals } from "../dist/lib/signals.js"
import { computeTrust } from "../dist/lib/trust.js"

function normalizeAction(value) {
  return value === "accept" || value === "review" || value === "reject"
    ? value
    : "review"
}

function severity(action) {
  return { accept: 0, review: 1, reject: 2 }[action] ?? 1
}

const results = cases.map((item) => {
  const score = scoreResponse(item)
  const signals = computeSignals(item.prompt, item.response)
  const trust = computeTrust(signals)
  const actual = normalizeAction(trust.recommended_action)
  const expected = normalizeAction(item.expected_action)

  return {
    id: item.id,
    domain: item.domain,
    expected_action: expected,
    actual_action: actual,
    risk_level: trust.risk_level,
    trust_score: trust.trust_score,
    consistency_score: score.consistency_score,
    hallucination_risk: score.hallucination_risk,
    pass: actual === expected,
    false_positive: severity(actual) > severity(expected),
    false_negative: severity(actual) < severity(expected)
  }
})

const passed = results.filter((item) => item.pass).length
const falsePositives = results.filter((item) => item.false_positive).length
const falseNegatives = results.filter((item) => item.false_negative).length
const accuracy = Number((passed / results.length).toFixed(4))

const summary = {
  cases: results.length,
  passed,
  failed: results.length - passed,
  accuracy,
  false_positives: falsePositives,
  false_negatives: falseNegatives,
  by_action: results.reduce((acc, item) => {
    acc[item.actual_action] = (acc[item.actual_action] || 0) + 1
    return acc
  }, {})
}

console.log(JSON.stringify({ summary, results }, null, 2))

if (accuracy < 0.5) {
  console.error("BENCHMARK_WARNING: accuracy below 0.5; calibration work is needed")
}
