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

## Portable Signature Check

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

Send the object to `POST /trust/verify-signature`. This avoids decimal
re-serialization differences across JavaScript, Python, PowerShell, and other
runtimes. Sending the complete receipt remains available for compatibility.
