# Policies

Policies define how a client wants InterAI Risk Oracle decisions to be applied.

Example:

```json
{
  "max_risk_level": "medium",
  "require_trust_receipt": true,
  "amount_usd_limit": 500,
  "blocked_action_types": ["irreversible_transfer"],
  "require_human_review_above": 0.75,
  "require_user_confirmation_for_irreversible": true
}
```

Common policy controls:

- maximum acceptable risk level
- receipt requirement
- amount limits
- review threshold
- blocked action categories
- allowed action categories
- user confirmation for irreversible actions
- environment-specific rules

