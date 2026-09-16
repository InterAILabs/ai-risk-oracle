import test from "node:test";
import assert from "node:assert/strict";
import {
  ReceiptVerificationError,
  assertReceiptIntentDigest,
  requireOwnerSignedEvidence,
  verifyReceiptWithService,
} from "./index.mjs";

function ownerLookup() {
  return {
    ok: true,
    receipt: {
      receipt_id: "tr_test",
      issued_at: "2026-09-16T00:00:00.000Z",
      receipt_schema_version: "trust-receipt/v2",
      execution_intent_digest: "abc123",
    },
    verification: {
      signed: true,
      signature: "deadbeef",
      signature_alg: "hmac-sha256",
      verification_scope: "service_verifiable",
      signed_payload: '{"exact":"bytes"}',
      signature_valid: true,
    },
    metadata: {},
  };
}

test("anonymous summary is never accepted as signed evidence", () => {
  assert.throws(
    () =>
      requireOwnerSignedEvidence({
        ok: true,
        visibility: "public_summary",
        receipt: { receipt_id: "tr_test", issued_at: "2026-09-16T00:00:00.000Z" },
        full_receipt_requires_owner: true,
      }),
    (error) => error instanceof ReceiptVerificationError && error.code === "public_summary_only",
  );
});

test("intent digest must match exactly", () => {
  assert.equal(assertReceiptIntentDigest(ownerLookup(), "abc123"), true);
  assert.throws(
    () => assertReceiptIntentDigest(ownerLookup(), "different"),
    (error) => error.code === "execution_intent_mismatch",
  );
});

test("service verification forwards opaque signed payload unchanged", async () => {
  const lookup = ownerLookup();
  let posted;
  const result = await verifyReceiptWithService({
    lookup,
    fetchImpl: async (_url, init) => {
      posted = JSON.parse(init.body);
      return { ok: true, json: async () => ({ valid: true, signature_alg: "hmac-sha256" }) };
    },
  });
  assert.equal(posted.signed_payload, lookup.verification.signed_payload);
  assert.equal(posted.receipt_id, "tr_test");
  assert.equal(result.valid, true);
});

test("invalid signature fails closed", async () => {
  await assert.rejects(
    verifyReceiptWithService({
      lookup: ownerLookup(),
      fetchImpl: async () => ({ ok: true, json: async () => ({ valid: false, signature_alg: "hmac-sha256" }) }),
    }),
    (error) => error instanceof ReceiptVerificationError && error.code === "invalid_signature",
  );
});

test("HTTP failure fails closed", async () => {
  await assert.rejects(
    verifyReceiptWithService({ lookup: ownerLookup(), fetchImpl: async () => ({ ok: false, status: 502 }) }),
    (error) => error.code === "verification_http_failed",
  );
});
