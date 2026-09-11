# Autonomous Execution

Autonomous Execution is the wedge for InterAI Risk Oracle: before an agent calls
a tool, releases funds, places a trade, or commits to an irreversible workflow,
the action should pass through an independent verification checkpoint.

## Pattern

1. Agent proposes an action.
2. InterAI verifies the action, context, and policy constraints.
3. For a canonical host-attested action, InterAI returns a decision, `execution_intent_digest`, DecisionReceipt evidence, and an `ExecutionAuthorization` only for an authenticated `allow`.
4. The host verifies the receipt, rebuilds the final intent, compares its digest, validates TTL/binding, and atomically consumes the authorization immediately before the side effect.
5. The agent executes, routes, or blocks the action.

## Recommended Controls

- Require verification for high-impact tools.
- Treat `review_required` as non-authorizing: the current agent should not execute
  autonomously under the current policy.
- Route `review_required` to a supervisor agent, policy system, wallet rule,
  governance queue, or human operator.
- Treat `block` as a non-authorizing hard stop.
- Treat an action modified during review as a new intent requiring a new decision.
- Do not treat a DecisionReceipt as an execution token; record separate host evidence for execution outcome.
- Treat authorization as 1–300 seconds (60 seconds default), single-use, and fail-closed. Durable replay prevention remains the host's responsibility across external runtimes.
- Store `trust_receipt_id` with the downstream execution record.
- Use stable operation IDs in your own system to prevent duplicate execution.
