import test from "node:test";
import assert from "node:assert/strict";
import {
  ActionBindingError,
  actionDigest,
  assertActionMatches,
  canonicalJson,
  createActionBinding,
  snapshotJson,
} from "./index.mjs";

test("canonicalization is stable across object key order", () => {
  assert.equal(canonicalJson({ b: 2, a: 1 }), canonicalJson({ a: 1, b: 2 }));
  assert.equal(actionDigest({ b: 2, a: 1 }), actionDigest({ a: 1, b: 2 }));
});

test("binding rejects action mutation", () => {
  const action = { tool: "transfer", args: { amount: 10, to: "alice" } };
  const binding = createActionBinding(action);
  action.args.amount = 11;
  assert.throws(() => assertActionMatches(binding, action), (error) => {
    assert.equal(error.code, "action_binding_mismatch");
    return true;
  });
});

test("binding accepts the exact action", () => {
  const action = { tool: "email.send", args: { to: "ops@example.test", subject: "Status" } };
  const binding = createActionBinding(action);
  assert.equal(assertActionMatches(binding, action), true);
});

test("snapshot is deeply frozen and detached from the input", () => {
  const original = { tool: "db.update", args: { id: 7 } };
  const snapshot = snapshotJson(original);
  original.args.id = 8;
  assert.equal(snapshot.args.id, 7);
  assert.equal(Object.isFrozen(snapshot), true);
  assert.equal(Object.isFrozen(snapshot.args), true);
});

test("non-JSON values fail closed", () => {
  assert.throws(() => canonicalJson({ amount: Number.NaN }), ActionBindingError);
  assert.throws(() => canonicalJson({ callback: () => {} }), ActionBindingError);
  assert.throws(() => canonicalJson({ missing: undefined }), ActionBindingError);
});
