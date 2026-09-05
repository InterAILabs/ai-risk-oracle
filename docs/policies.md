# Policies

Policies define how InterAI Risk Oracle applies execution constraints to an autonomous action.

The hosted service now enforces a versioned **InterAI host policy floor** before a
caller-supplied policy is applied. The caller policy is treated as an additional
set of constraints: it may make the effective policy stricter, but it cannot
weaken or remove host requirements.

The current hosted baseline is intentionally small:

```json
{
  "require_user_confirmation_for_irreversible": true,
  "require_trust_receipt": true
}
```

Caller-provided policy can add controls such as:

```json
{
  "max_risk_level": "medium",
  "require_trust_receipt": true,
  "amount_usd_limit": 500,
  "blocked_action_types": ["irreversible_transfer"],
  "allowed_action_types": ["payment", "tool_call"],
  "require_human_review_above": 0.75,
  "require_user_confirmation_for_irreversible": true
}
```

Common policy controls:

- maximum allowed risk level
- receipt requirement
- amount limit
- allowed or blocked action types
- risk score review threshold
- blocked action categories
- irreversible action user confirmation

Composition follows the stricter result for each supported control. For example,
blocked action types are combined, compatible allowlists are intersected,
monetary/review thresholds use the stricter value, and a required confirmation or
receipt cannot be disabled by the caller.

Policy enforcement can escalate a decision to `review_required` or `block`; it
does not downgrade a risky backend decision into a safer action.

`review_required` means the current agent should not execute autonomously under
the effective policy. The reviewer may be another agent, a policy system, a
wallet rule, a governance queue, or a human operator.

## Current authority boundary

The hosted baseline is an InterAI-controlled host policy profile, currently
`interai-host-autonomous-baseline` version `1`. Autonomous trust receipts bind the
host policy provenance and digests for the caller policy and effective policy.

This does **not** yet mean that customers can create or administer independent
per-tenant or per-account authoritative policy profiles. Tenant/account policy
management and authorization are a separate capability from the current hosted
baseline.
