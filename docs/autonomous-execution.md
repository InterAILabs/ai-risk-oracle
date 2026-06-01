# Autonomous Execution

Autonomous Execution is the wedge for InterAI Risk Oracle: before an agent calls
a tool, releases funds, places a trade, or commits to an irreversible workflow,
the action should pass through an independent verification checkpoint.

## Pattern

1. Agent proposes an action.
2. InterAI verifies the action, context, and policy constraints.
3. InterAI returns a score, risk level, action signals, policy result, recommendation, and receipt.
4. The agent allows, pauses for review, or blocks the action.

## Recommended Controls

- Require verification for high-impact tools.
- Treat `review_required` as a pause, not an approval.
- Store `trust_receipt_id` with the downstream execution record.
- Use stable operation IDs in your own system to prevent duplicate execution.

## Gateway Decisions

- `allow`: proceed with the downstream action.
- `review_required`: pause execution and route to a human or higher-trust policy path.
- `block`: do not execute the proposed action.

