import assert from "node:assert/strict"
import test from "node:test"
import { DecisionBindings, localIntentDigest, type PaymentArgs } from "./intent-binding.js"

const vendorA: PaymentArgs = { vendorId: "vendor-a", amountUsd: 250 }
const vendorB: PaymentArgs = { vendorId: "vendor-b", amountUsd: 250 }

// These reproduce the two args-only boundaries in example.ts. They deliberately
// do not invent a toolCallId: Mastra does not provide one at either boundary.
function requireApprovalWithoutToolCallId(bindings: DecisionBindings, args: PaymentArgs) {
  const bound = bindings.uniqueFor(args)
  return !bound || bound.decision === "review_required"
}

function canProceedBeforeToolCallWithoutToolCallId(bindings: DecisionBindings, args: PaymentArgs) {
  const bound = bindings.uniqueFor(args)
  return !!bound && bound.decision !== "block"
}

test("ALLOW with the same args executes once", () => {
  const bindings = new DecisionBindings()
  bindings.remember("call-1", vendorA, { decision: "allow", executionIntentDigest: "interai-a" })
  assert.equal(bindings.consumeForExecution("call-1", vendorA).decision, "allow")
  assert.throws(() => bindings.consumeForExecution("call-1", vendorA))
})

test("BLOCK never authorizes execution", () => {
  const bindings = new DecisionBindings()
  bindings.remember("call-1", vendorA, { decision: "block" })
  assert.throws(() => bindings.consumeForExecution("call-1", vendorA), /non-authorizing/)
})

test("REVIEW_REQUIRED decline has no execution consumption", () => {
  const bindings = new DecisionBindings()
  bindings.remember("call-1", vendorA, { decision: "review_required" })
  assert.equal(bindings.uniqueFor(vendorA)?.decision, "review_required")
})

test("REVIEW_REQUIRED approval can execute exactly once", () => {
  const bindings = new DecisionBindings()
  bindings.remember("call-1", vendorA, { decision: "review_required" })
  assert.equal(bindings.consumeForExecution("call-1", vendorA).decision, "review_required")
  assert.throws(() => bindings.consumeForExecution("call-1", vendorA))
})

test("vendor A/$250 cannot authorize vendor B/$250", () => {
  const bindings = new DecisionBindings()
  bindings.remember("call-1", vendorA, { decision: "allow" })
  assert.notEqual(localIntentDigest(vendorA), localIntentDigest(vendorB))
  assert.throws(() => bindings.consumeForExecution("call-1", vendorB), /exact Mastra tool call and arguments/)
})

test("two identical concurrent calls never borrow a decision through args-only lookup", () => {
  const bindings = new DecisionBindings()
  bindings.remember("call-1", vendorA, { decision: "allow" })
  bindings.remember("call-2", vendorA, { decision: "allow" })
  assert.equal(bindings.uniqueFor(vendorA), undefined)
  assert.equal(bindings.consumeForExecution("call-1", vendorA).toolCallId, "call-1")
  assert.equal(bindings.consumeForExecution("call-2", vendorA).toolCallId, "call-2")
})

test("two identical ALLOW calls are conservatively gated before exact execution binding", () => {
  const bindings = new DecisionBindings()
  bindings.remember("call-1", vendorA, { decision: "allow" })
  bindings.remember("call-2", vendorA, { decision: "allow" })
  assert.equal(requireApprovalWithoutToolCallId(bindings, vendorA), true)
  assert.equal(canProceedBeforeToolCallWithoutToolCallId(bindings, vendorA), false)
  assert.equal(bindings.consumeForExecution("call-1", vendorA).toolCallId, "call-1")
  assert.equal(bindings.consumeForExecution("call-2", vendorA).toolCallId, "call-2")
})

test("identical REVIEW_REQUIRED calls cannot be selected by args-only boundaries", () => {
  const bindings = new DecisionBindings()
  bindings.remember("call-1", vendorA, { decision: "review_required" })
  bindings.remember("call-2", vendorA, { decision: "review_required" })
  assert.equal(requireApprovalWithoutToolCallId(bindings, vendorA), true)
  assert.equal(canProceedBeforeToolCallWithoutToolCallId(bindings, vendorA), false)
  // A native Mastra approval identifies a call by toolCallId; final consumption does too.
  assert.equal(bindings.consumeForExecution("call-1", vendorA).toolCallId, "call-1")
  assert.equal(bindings.consumeForExecution("call-2", vendorA).toolCallId, "call-2")
})

test("mixed ALLOW and REVIEW_REQUIRED never lets args-only approval pick either decision", () => {
  const bindings = new DecisionBindings()
  bindings.remember("call-1", vendorA, { decision: "allow" })
  bindings.remember("call-2", vendorA, { decision: "review_required" })
  assert.equal(requireApprovalWithoutToolCallId(bindings, vendorA), true)
  assert.equal(canProceedBeforeToolCallWithoutToolCallId(bindings, vendorA), false)
})

test("mixed BLOCK and ALLOW never lets args-only beforeToolCall attribute BLOCK to either call", () => {
  const bindings = new DecisionBindings()
  bindings.remember("call-1", vendorA, { decision: "block" })
  bindings.remember("call-2", vendorA, { decision: "allow" })
  assert.equal(requireApprovalWithoutToolCallId(bindings, vendorA), true)
  assert.equal(canProceedBeforeToolCallWithoutToolCallId(bindings, vendorA), false)
})

test("consuming approved call-1 leaves call-2's review binding untouched", () => {
  const bindings = new DecisionBindings()
  bindings.remember("call-1", vendorA, { decision: "review_required" })
  bindings.remember("call-2", vendorA, { decision: "review_required" })
  assert.equal(bindings.consumeForExecution("call-1", vendorA).toolCallId, "call-1")
  // A later attempt with call-1 cannot consume call-2's still-pending binding.
  assert.throws(() => bindings.consumeForExecution("call-1", vendorA))
  assert.equal(bindings.uniqueFor(vendorA)?.toolCallId, "call-2")
})

test("duplicate resume cannot produce a second local execution", () => {
  const bindings = new DecisionBindings()
  bindings.remember("call-1", vendorA, { decision: "review_required" })
  bindings.consumeForExecution("call-1", vendorA)
  assert.throws(() => bindings.consumeForExecution("call-1", vendorA))
})
