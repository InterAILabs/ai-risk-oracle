# Trust Receipts

Trust receipts are durable records that a verification decision happened before
an autonomous action executed.

## Public Fields

- `trust_receipt_id`
- `decision_id`
- `issued_at`
- `use_case`
- `risk_level`
- `recommended_action`
- `policy_summary`
- `signals`

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

Hosted autonomous execution now uses a versioned InterAI-controlled host policy
floor. The caller-supplied `policy` object is composed on top of that floor and
may only tighten supported constraints; it cannot remove or weaken the host
requirements.

The current hosted profile is `interai-host-autonomous-baseline` version `1`.
Trust receipt v2 binds policy authority metadata, including the authoritative
profile digest plus digests for the caller policy and the resulting effective
policy. This lets the receipt show which host policy boundary was in force for the
decision.

The current host baseline is deliberately small and requires:

- user confirmation for irreversible actions
- a trust receipt for the decision

This is a host-level baseline, not yet a customer-administered tenant policy
system. InterAI does not currently claim independently configurable per-tenant or
per-account authoritative policy profiles, policy mutation authorization, or
customer-managed policy version lifecycle.
