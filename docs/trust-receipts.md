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

The `policy` object supplied in the current autonomous request is caller-provided
request context. It can constrain the decision for that request, but its presence
does not prove that the caller was unable to remove or weaken the policy.

A stronger tenant/host enforcement guarantee requires policy to be anchored
outside the controlled action request and managed by an authority the gated actor
cannot modify.
