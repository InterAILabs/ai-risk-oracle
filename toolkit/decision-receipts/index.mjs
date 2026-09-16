export class ReceiptVerificationError extends Error {
  constructor(code, message, options = {}) {
    super(message, options);
    this.name = "ReceiptVerificationError";
    this.code = code;
  }
}

export function requireOwnerSignedEvidence(lookup) {
  if (!lookup || typeof lookup !== "object" || lookup.ok !== true) {
    throw new ReceiptVerificationError("invalid_lookup", "Receipt lookup is not a successful response");
  }
  if (lookup.visibility === "public_summary") {
    throw new ReceiptVerificationError(
      "public_summary_only",
      "Anonymous receipt summaries are references only and cannot authorize execution",
    );
  }

  const receipt = lookup.receipt;
  const verification = lookup.verification;
  if (!receipt || typeof receipt.receipt_id !== "string" || !verification) {
    throw new ReceiptVerificationError("missing_signed_evidence", "Complete owner-authenticated receipt evidence is required");
  }
  if (
    verification.signed !== true ||
    verification.verification_scope !== "service_verifiable" ||
    typeof verification.signature !== "string" ||
    verification.signature.length === 0 ||
    verification.signature_alg !== "hmac-sha256" ||
    typeof verification.signed_payload !== "string" ||
    verification.signed_payload.length === 0
  ) {
    throw new ReceiptVerificationError("missing_signed_evidence", "Receipt does not contain complete service-verifiable evidence");
  }

  return { receipt, verification };
}

export function assertReceiptIntentDigest(lookup, expectedDigest) {
  const { receipt } = requireOwnerSignedEvidence(lookup);
  if (typeof expectedDigest !== "string" || expectedDigest.length === 0) {
    throw new TypeError("expectedDigest must be a non-empty string");
  }
  if (receipt.execution_intent_digest !== expectedDigest) {
    throw new ReceiptVerificationError(
      "execution_intent_mismatch",
      "Receipt execution intent does not match the action about to execute",
    );
  }
  return true;
}

export async function verifyReceiptWithService({
  lookup,
  baseUrl = "https://api.interailabs.dev",
  fetchImpl = globalThis.fetch,
  timeoutMs = 5000,
}) {
  if (typeof fetchImpl !== "function") throw new TypeError("A fetch implementation is required");
  const { receipt, verification } = requireOwnerSignedEvidence(lookup);

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  let response;
  try {
    response = await fetchImpl(`${baseUrl.replace(/\/$/, "")}/trust/verify-signature`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      signal: controller.signal,
      body: JSON.stringify({
        receipt_id: receipt.receipt_id,
        signed_payload: verification.signed_payload,
        signature: verification.signature,
        signature_alg: verification.signature_alg,
      }),
    });
  } catch (error) {
    throw new ReceiptVerificationError("verification_transport_failed", "Receipt verification request failed", {
      cause: error,
    });
  } finally {
    clearTimeout(timeout);
  }

  if (!response || response.ok !== true) {
    throw new ReceiptVerificationError("verification_http_failed", "Receipt verification endpoint rejected the request");
  }

  let body;
  try {
    body = await response.json();
  } catch (error) {
    throw new ReceiptVerificationError("verification_parse_failed", "Receipt verification returned invalid JSON", {
      cause: error,
    });
  }

  if (!body || body.valid !== true || body.signature_alg !== verification.signature_alg) {
    throw new ReceiptVerificationError("invalid_signature", "Receipt signature was not validated by InterAI");
  }

  return Object.freeze({ valid: true, signature_alg: body.signature_alg, receipt_id: receipt.receipt_id });
}
