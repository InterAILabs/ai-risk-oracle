# Policies

Policies define how a client wants InterAI Risk Oracle decisions to be applied.

Example:

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
- environment-specific rules

Policy enforcement can escalate a decision to `review_required` or `block`; it
does not downgrade a risky backend decision into a safer action.
