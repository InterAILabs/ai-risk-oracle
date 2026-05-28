import cases from "./cases.json" with { type: "json" }
import fs from "node:fs"
import path from "node:path"
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

function riskSeverity(riskLevel) {
  return { low: 0, medium: 1, high: 2 }[riskLevel] ?? 1
}

const actions = ["accept", "review", "reject"]

const results = cases.map((item) => {
  const score = scoreResponse(item)
  const signals = computeSignals(item.prompt, item.response)
  const trust = computeTrust(signals)
  const actual = normalizeAction(trust.recommended_action)
  const expected = normalizeAction(item.expected_action)
  const expectedMaxRiskLevel = item.expected_max_risk_level
  const riskPass =
    !expectedMaxRiskLevel ||
    riskSeverity(trust.risk_level) <= riskSeverity(expectedMaxRiskLevel)

  return {
    id: item.id,
    domain: item.domain,
    expected_action: expected,
    expected_max_risk_level: expectedMaxRiskLevel ?? null,
    actual_action: actual,
    risk_level: trust.risk_level,
    trust_score: trust.trust_score,
    consistency_score: score.consistency_score,
    hallucination_risk: score.hallucination_risk,
    pass: actual === expected && riskPass,
    false_positive: severity(actual) > severity(expected),
    false_negative: severity(actual) < severity(expected),
    notes: item.notes ?? null
  }
})

const passed = results.filter((item) => item.pass).length
const falsePositives = results.filter((item) => item.false_positive).length
const falseNegatives = results.filter((item) => item.false_negative).length
const accuracy = Number((passed / results.length).toFixed(4))
const failures = results
  .filter((item) => !item.pass)
  .map((item) => ({
    id: item.id,
    domain: item.domain,
    expected_action: item.expected_action,
    actual_action: item.actual_action,
    trust_score: Number(item.trust_score.toFixed(4)),
    risk_level: item.risk_level
  }))

const confusionMatrix = Object.fromEntries(
  actions.map((expected) => [
    expected,
    Object.fromEntries(actions.map((actual) => [actual, 0]))
  ])
)

const accuracyByExpectedAction = Object.fromEntries(
  actions.map((action) => {
    const group = results.filter((item) => item.expected_action === action)
    const groupPassed = group.filter((item) => item.pass).length
    return [
      action,
      {
        cases: group.length,
        passed: groupPassed,
        accuracy: group.length ? Number((groupPassed / group.length).toFixed(4)) : null
      }
    ]
  })
)

for (const item of results) {
  confusionMatrix[item.expected_action][item.actual_action] += 1
}

const summary = {
  total_cases: results.length,
  passed,
  failed: results.length - passed,
  accuracy,
  false_positives: falsePositives,
  false_negatives: falseNegatives,
  actual_by_action: results.reduce((acc, item) => {
    acc[item.actual_action] = (acc[item.actual_action] || 0) + 1
    return acc
  }, {})
}

const report = {
  summary,
  accuracy_by_expected_action: accuracyByExpectedAction,
  confusion_matrix: confusionMatrix,
  failures,
  results
}

console.log(`Benchmark cases: ${summary.total_cases}`)
console.log(`Accuracy: ${(summary.accuracy * 100).toFixed(2)}%`)
console.log(`Passed: ${summary.passed}`)
console.log(`Failed: ${summary.failed}`)
console.log(`False positives: ${summary.false_positives}`)
console.log(`False negatives: ${summary.false_negatives}`)
console.log("")
console.log("Accuracy by expected action:")
for (const action of actions) {
  const item = accuracyByExpectedAction[action]
  const rendered =
    item.accuracy == null ? "n/a" : `${(item.accuracy * 100).toFixed(2)}%`
  console.log(`- ${action}: ${rendered} (${item.passed}/${item.cases})`)
}
console.log("")
console.log("Confusion matrix (expected -> actual):")
for (const expected of actions) {
  const row = confusionMatrix[expected]
  console.log(
    `- ${expected}: accept=${row.accept}, review=${row.review}, reject=${row.reject}`
  )
}
console.log("")

if (failures.length) {
  console.log("Failures:")
  for (const failure of failures) {
    console.log(
      `- ${failure.id}: expected=${failure.expected_action}, got=${failure.actual_action}, trust=${failure.trust_score}, risk=${failure.risk_level}`
    )
  }
} else {
  console.log("Failures: none")
}

const outputFlag = process.argv.find((arg) => arg.startsWith("--output="))
if (process.argv.includes("--write-json") || outputFlag) {
  const outputPath = outputFlag
    ? outputFlag.slice("--output=".length)
    : path.join("benchmarks", "results", "latest.json")
  fs.mkdirSync(path.dirname(outputPath), { recursive: true })
  fs.writeFileSync(outputPath, `${JSON.stringify(report, null, 2)}\n`)
  console.log("")
  console.log(`Wrote JSON report: ${outputPath}`)
}

if (accuracy < 0.5) {
  console.error("BENCHMARK_WARNING: accuracy below 0.5; calibration work is needed")
}
