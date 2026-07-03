# Integration Patterns

InterAI Risk Oracle is designed to sit between an agent and the action it wants
to execute. The agent proposes an action, InterAI verifies it, and the caller
maps the decision before any tool, payment, wallet, database, email, or command
actually runs.

## Where InterAI Fits

Use InterAI before:

- tool execution
- payment release
- wallet signing
- database update
- email send
- script or shell command
- workflow approval

InterAI should be one checkpoint in a broader control system. It does not replace
your permissions, signing policy, payment controls, database authorization, or
human review process.

## Universal Pattern

```text
agent proposes action
-> InterAI /verify
-> decision
-> execute / route / block
-> store trust receipt
```

Decision mapping:

- `allow`: execute the action under your normal permissions.
- `review_required`: route to a supervisor, human, policy engine, or queue.
- `block`: abort the action and log the decision.

## Pseudocode

```text
decision = interai.verify(action)
if decision.allow:
  execute(action)
elif decision.review_required:
  route_to_review(action)
else:
  block(action)
store(decision.trust_receipt_id)
```

## Example Actions

Read-only lookup:

```json
{
  "type": "read_only_lookup",
  "name": "check_order_status",
  "external_side_effect": false,
  "irreversible": false
}
```

Email send:

```json
{
  "type": "email_send",
  "name": "send_customer_update",
  "external_side_effect": true,
  "irreversible": false
}
```

Payment release:

```json
{
  "type": "payment",
  "name": "release_vendor_payment",
  "amount_usd": 125,
  "currency": "USD",
  "external_side_effect": true,
  "irreversible": false
}
```

Database write:

```json
{
  "type": "database_write",
  "name": "update_subscription_status",
  "external_side_effect": true,
  "irreversible": false
}
```

Script or shell command:

```json
{
  "type": "script_run",
  "name": "run_cleanup_job",
  "external_side_effect": true,
  "irreversible": true
}
```

Wallet signing:

```json
{
  "type": "wallet_signing",
  "name": "sign_transaction",
  "external_side_effect": true,
  "irreversible": true
}
```

Do not send raw private keys, seed phrases, authorization headers, API keys, or
unnecessary sensitive data in verification payloads.

## Trust Receipts

Store `trust_receipt_id` with your job, tool call, workflow, payment, or audit
record. A receipt helps prove that a pre-execution verification occurred and
what InterAI recommended at that time.

Do not assume a trust receipt proves the underlying action is safe forever,
guarantees factual truth, or replaces your own access controls. It is decision
evidence, not a permission system.

## Minimal Payload Guidance

Send enough action context for policy decisions, but minimize sensitive data:

- action type and name
- side-effect flags
- irreversibility
- approximate amount or limit where needed
- environment, such as sandbox or production
- whether a user confirmed the action
- policy constraints you want enforced

Avoid sending raw secrets, raw private keys, full customer records, unnecessary
message bodies, credentials, or bearer tokens.

## Examples

- TypeScript middleware:
  `examples/agent-middleware/typescript/`
- Python middleware:
  `examples/agent-middleware/python/`

Both examples use a fake sandbox executor. Replace that executor only after the
InterAI gate returns `allow`.

## Beta Status

InterAI Risk Oracle is a controlled public beta for agent-native pre-execution
verification. It is useful for integration design, gating, and audit trails, but
it should not be treated as high-volume enterprise production infrastructure
without additional operational review and controls.
