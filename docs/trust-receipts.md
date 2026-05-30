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

