# Agent Bounties bounded decision interface

This interface is intentionally off-chain. It does not add storage, hooks, signing authority, verifier authority, or new execution rights to `BoundedAgentWallet`.

## Host-provided proposal

The host constructs an exact immutable proposal immediately before delegated signing:

```json
{
  "schema": "interai-agent-bounties-binding/v1",
  "chain_id": 8453,
  "wallet": "0x1111111111111111111111111111111111111111",
  "caller_delegate": "0x2222222222222222222222222222222222222222",
  "target": "0x3333333333333333333333333333333333333333",
  "calldata_hash": "0xabab...abab",
  "token": "0x4444444444444444444444444444444444444444",
  "amount": 2500000,
  "nonce": 17,
  "expiry": 1800000000,
  "policy_version": 6,
  "policy_hash": "0xcdcd...cdcd"
}
```

The adapter canonicalizes this object with stable field ordering and computes an `execution_intent_digest` over the exact canonical JSON bytes.

## Decision response

A decision provider must return an object equivalent to:

```json
{
  "decision": "allow",
  "issuer": "interai:test",
  "decision_id": "decision-001",
  "execution_intent_digest": "<sha256>",
  "policy_version": 6,
  "policy_hash": "0xcdcd...cdcd",
  "issued_at": "2026-09-15T11:59:59+00:00",
  "expires_at": "2026-09-15T12:01:00+00:00"
}
```

Only `allow` is authorizing. `review_required`, `block`, timeout, transport failure, malformed response, unknown issuer, expired decision, stale policy, replay, digest mismatch, action mutation, or deterministic wallet denial all stop the path before delegated signing.

## Terminal revalidation

After a valid contextual `allow`, and immediately before signing, the host re-reads:

- the final exact delegated action;
- wallet nonce and action identity;
- wallet policy version and policy hash;
- all deterministic BoundedAgentWallet constraints relevant to the action.

If anything changed, the prior decision is not reused. A new exact proposal requires a new decision.

## Authority rule

The contextual decision is monotonic/subordinate:

```text
existing wallet authority AND contextual ALLOW -> may proceed to signing
existing wallet hard denial AND contextual ALLOW -> deny
REVIEW_REQUIRED -> no signing now
BLOCK -> no signing
provider uncertainty/failure -> no signing
```

An InterAI `allow` can never create target, amount, verifier, action, nonce, or policy authority that the wallet did not already grant.
