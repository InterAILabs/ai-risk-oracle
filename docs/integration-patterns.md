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
-> host builds trusted canonical action + execution context
-> InterAI /verify
-> decision, execution_intent_digest, DecisionReceipt, and allow-only authorization
-> host verifies receipt, rebuilds exact final intent, validates digest/TTL/single-use
-> execute / route / block
-> store decision and separate host execution evidence
```

Decision mapping:

- `allow`: only execute after service-side receipt verification and exact final-intent, TTL, and single-use authorization validation.
- `review_required`: non-authorizing; route to a supervisor, human, policy engine, or queue.
- `block`: non-authorizing; abort and log the decision.

## Pseudocode

```text
decision = interai.verify(host.canonical_action_and_context())
final_intent = host.rebuild_final_intent()
if decision.allow and verify_receipt(decision) and validate_authorization(decision, final_intent):
  execute(final_intent)
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

## Exact intent, review, and Pydantic AI

`CanonicalExecutionIntent` (`interai-canonical-execution-intent/v2`) binds a host-attested canonical action, evaluation context, authenticated/host authority context, and policy authority. A material mutation, including review edits, is a new intent requiring a new decision. For Pydantic AI: `proposal -> review/ToolApproved.override_args -> host canonicalization -> InterAI -> receipt + exact-intent/authorization validation -> execute`.

## Receipts

Store `trust_receipt_id` with your job, tool call, workflow, payment, or audit
record. A DecisionReceipt helps prove a pre-execution decision and its intent digest. It is not a bearer token. `ExecutionAuthorization` is allow-only, single-use, and valid for 1–300 seconds (60 seconds default); external hosts must durably consume it atomically when needed. An ExecutionReceipt is separate host/runtime evidence of dispatch or outcome; InterAI does not claim success without that evidence.

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
InterAI gate returns `allow` and the final intent matches its digest.

## Beta Status

InterAI Risk Oracle is a controlled public beta for agent-native pre-execution
verification. It is useful for integration design, gating, and audit trails, but
it should not be treated as high-volume enterprise production infrastructure
without additional operational review and controls.
