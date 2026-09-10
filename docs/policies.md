# Policies

Policies define the execution constraints InterAI applies to an autonomous action before returning `allow`, `review_required`, or `block`.

Hosted authenticated execution composes policy in strict authority order:

```text
HOST -> ACCOUNT -> CALLER -> EFFECTIVE
```

- The **host policy** is an InterAI-controlled irreducible floor.
- An optional **account policy** is a versioned profile stored outside the action request and resolved only after a bearer credential is authenticated to its account.
- The **caller policy** is request-scoped and may only tighten higher-authority constraints.
- The **effective policy** is the stricter composition used for the final authority decision.

Accountless/x402 execution has no authenticated account profile and therefore remains:

```text
HOST -> CALLER -> EFFECTIVE
```

The current hosted host baseline is intentionally small:

```json
{
  "require_user_confirmation_for_irreversible": true,
  "require_trust_receipt": true
}
```

For new integrations, prefer policy controls that directly express the execution boundary:

```json
{
  "require_trust_receipt": true,
  "amount_usd_limit": 500,
  "blocked_action_types": ["irreversible_transfer"],
  "allowed_action_types": ["payment", "tool_call"],
  "require_user_confirmation_for_irreversible": true
}
```

Common direct controls include:

- receipt requirement;
- amount limit;
- allowed or blocked action types;
- irreversible-action confirmation requirements.

The hosted compatibility contract also supports legacy scalar controls such as `max_risk_level` and `require_human_review_above`. They remain valid for the current production-compatible evaluator and existing integrations, but new policy design should not depend on them when the intended rule can be expressed directly as action/policy semantics.

Composition follows the stricter result for each supported control. Blocked action types are combined, compatible allowlists are intersected, monetary limits use the stricter value, and a required confirmation or receipt cannot be disabled by a lower-authority layer.

If enforced allowlists have no common action type, the empty intersection remains an enforceable **deny-all** state rather than falling back to an unrestricted list.

Policy enforcement can escalate a decision to `review_required` or `block`; it does not weaken a higher-authority restriction.

`review_required` means the current agent should not execute autonomously under the effective policy. The reviewer may be another agent, a policy system, a wallet rule, a governance queue, or a human operator.

## Current authority boundary

The host profile is currently `interai-host-autonomous-baseline` version `1`.

For authenticated accounts, InterAI can attach a versioned account profile after the API key resolves to its account. The profile is outside the action request, so the caller cannot remove it by omitting or weakening the request `policy` object. A caller may still add stricter request-specific constraints.

Account policy version/digest participates in authenticated decision identity. Reusing an idempotency key after the applicable account policy changes conflicts rather than silently replaying a decision produced under the older policy.

Autonomous trust receipts bind policy authority provenance for host, account when present, caller, and effective policy.

## Administration scope

Account policy administration is currently an **InterAI-administered control plane**. This does not yet claim:

- customer self-service policy editing;
- delegated tenant administrators;
- customer-controlled policy lifecycle or approval workflows;
- enterprise policy-management UX.

The enforcement boundary and the administration product are separate claims; the former is live, while the latter remains intentionally limited.
