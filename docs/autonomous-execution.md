# Autonomous Execution

Autonomous Execution is the wedge for InterAI Risk Oracle: before an agent calls
a tool, releases funds, places a trade, or commits to an irreversible workflow,
the action should pass through an independent verification checkpoint.

## Pattern

1. Agent proposes an action.
2. InterAI verifies the action, context, and policy constraints.
3. InterAI returns a decision, `execution_intent_digest`, and DecisionReceipt evidence.
4. The host rebuilds the final intent and compares its digest immediately before the side effect.
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
- Store `trust_receipt_id` with the downstream execution record.
- Use stable operation IDs in your own system to prevent duplicate execution.
