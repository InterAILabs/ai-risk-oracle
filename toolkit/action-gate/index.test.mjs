import test from "node:test";
import assert from "node:assert/strict";
import { GateClosedError, readAuthorityDecision, runActionGate } from "./index.mjs";

test("allow executes the exact frozen snapshot", async () => {
  const action = { tool: "email.send", args: { to: "ops@example.test" } };
  let executed = 0;
  const result = await runActionGate({
    action,
    decide: async (snapshot) => {
      assert.equal(Object.isFrozen(snapshot), true);
      assert.equal(Object.isFrozen(snapshot.args), true);
      return { recommended_action: "allow", policy_result: "allow" };
    },
    execute: async (snapshot) => {
      executed += 1;
      return snapshot.args.to;
    },
  });
  assert.equal(executed, 1);
  assert.equal(result.executed, true);
  assert.equal(result.execution_result, "ops@example.test");
});

test("block and review_required never call execute", async () => {
  for (const decision of ["block", "review_required"]) {
    let executed = 0;
    const result = await runActionGate({
      action: { tool: "wallet.sign", args: { amount: 25 } },
      decide: async () => ({ recommended_action: decision, policy_result: decision }),
      execute: async () => {
        executed += 1;
      },
    });
    assert.equal(executed, 0);
    assert.equal(result.executed, false);
    assert.equal(result.decision, decision);
  }
});

test("provider exceptions fail closed", async () => {
  let executed = 0;
  await assert.rejects(
    runActionGate({
      action: { tool: "script.run", args: {} },
      decide: async () => {
        throw new Error("502");
      },
      execute: async () => {
        executed += 1;
      },
    }),
    (error) => error instanceof GateClosedError && error.code === "decision_provider_failed",
  );
  assert.equal(executed, 0);
});

test("provider timeout fails closed", async () => {
  let executed = 0;
  await assert.rejects(
    runActionGate({
      action: { tool: "db.update", args: { id: 1 } },
      timeoutMs: 20,
      decide: async () => new Promise(() => {}),
      execute: async () => {
        executed += 1;
      },
    }),
    (error) => error instanceof GateClosedError && error.code === "decision_timeout",
  );
  assert.equal(executed, 0);
});

test("unknown authority values fail closed", () => {
  assert.throws(
    () => readAuthorityDecision({ recommended_action: "maybe", policy_result: "maybe" }),
    (error) => error.code === "unknown_decision",
  );
});

test("missing canonical authority fields fail closed", () => {
  assert.throws(
    () => readAuthorityDecision({ recommended_action: "allow" }),
    (error) => error.code === "missing_decision",
  );
  assert.throws(
    () => readAuthorityDecision({ policy_result: "allow" }),
    (error) => error.code === "missing_decision",
  );
  assert.throws(
    () => readAuthorityDecision({ final_decision: "allow", decision: "allow" }),
    (error) => error.code === "missing_decision",
  );
});

test("conflicting canonical authority fields fail closed", () => {
  assert.throws(
    () => readAuthorityDecision({ recommended_action: "allow", policy_result: "block" }),
    (error) => error.code === "conflicting_decisions",
  );
});

test("mutation after decision invalidates allow", async () => {
  const action = { tool: "transfer", args: { amount: 10 } };
  let executed = 0;
  await assert.rejects(
    runActionGate({
      action,
      decide: async () => {
        action.args.amount = 1000;
        return { recommended_action: "allow", policy_result: "allow" };
      },
      execute: async () => {
        executed += 1;
      },
    }),
    (error) => error instanceof GateClosedError && error.code === "action_changed",
  );
  assert.equal(executed, 0);
});
