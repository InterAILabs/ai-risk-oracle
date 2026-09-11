# Trust Receipts

DecisionReceipts are durable records that a verification decision happened before a host may attempt an autonomous action. They do not by themselves prove that an action executed.

## Public Fields

- `trust_receipt_id`
- `decision_id`
- `issued_at`
- `use_case`
- `risk_level`
- `recommended_action`
- `execution_intent_digest` when present for the autonomous contract
- `policy_summary`
- `signals`

## DecisionReceipt and ExecutionReceipt

A DecisionReceipt records InterAI's decision and bound intent. It is evidence, not a bearer token and not proof of execution. A separate ExecutionReceipt is host/runtime-produced evidence of dispatch or outcome and must identify its evidence source. `ExecutionAuthorization` is separate, is emitted only for an authenticated `allow`, and is bound to `execution_intent_digest`; it expires after 1–300 seconds (60 seconds by default) and is single-use. The host verifies the DecisionReceipt signature and provides durable, atomic consumption when protection must span external runtimes. InterAI does not claim universal distributed replay prevention or exactly-once execution.

## Uses

- audit trails
- agent-to-agent handoff
- post-incident review
- compliance evidence
- execution replay analysis

This public repository documents receipt contracts. It does not include receipt
signing internals or private trust logic.

## Signature Verification Scope

Current receipt signatures use HMAC-SHA256. They provide **service-verifiable
integrity**: InterAI can verify that the signed payload matches the receipt it
issued.

This is not an independently verifiable public-key signature. A third party that
does not possess the service signing secret cannot validate the HMAC offline on
its own. Do not treat the current receipt format as proof of independent public
attestation.

`GET /trust/receipts/{receipt_id}` returns `verification.signed_payload`. Treat
that value as opaque and forward it unchanged with the receipt ID and signature:

```json
{
  "receipt_id": "receipt-id",
  "signed_payload": "opaque-canonical-payload",
  "signature": "hex-signature",
  "signature_alg": "hmac-sha256"
}
```

Send the object to `POST /trust/verify-signature` for service-side verification.
Using the opaque payload avoids decimal re-serialization differences across
JavaScript, Python, PowerShell, and other runtimes. Sending the complete receipt
remains available for compatibility.

## Policy Authority Boundary

Authenticated autonomous execution composes policy in strict authority order:

```text
HOST -> ACCOUNT -> CALLER -> EFFECTIVE
```

The InterAI-controlled host policy is the irreducible floor. When a bearer credential resolves to an account that has a versioned policy profile, that account profile is composed next. The caller-supplied request policy is then allowed to tighten the result but cannot weaken host or account requirements.

Accountless/x402 execution has no account profile to resolve and therefore uses `HOST -> CALLER -> EFFECTIVE`.

The current host profile is `interai-host-autonomous-baseline` version `1` and requires:

- user confirmation for irreversible actions
- a trust receipt for the decision

Trust Receipt v2 binds policy authority metadata and digests so a signed decision can identify the policy boundary under which it was made. For authenticated requests this includes:

- host profile provenance and digest
- account profile provenance, version, and digest when present
- caller-policy digest
- composition order
- authoritative-policy digest
- effective-policy digest

Because account policy version/digest is also part of authenticated decision identity, a request cannot silently reuse an old idempotent decision after the applicable account policy has changed.

## Administration Scope

The account policy enforcement boundary is live, but account policy administration is currently an **InterAI-administered control plane**. InterAI does not yet claim customer self-service policy editing, delegated tenant policy administrators, or a customer-managed policy version lifecycle.
