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

Only `allow` is authorizing. `review_required`, `block`, timeout, transport failure, malformed response, unknown issuer, expired decision, expired action, stale policy, replay, digest mismatch, action mutation, or deterministic wallet denial all stop the path before delegated signing.

## Provider authentication boundary

The `issuer` field in this example is only an identity label for a **trusted local/mock decision provider**. String equality does not authenticate a remote response.

A future remote provider must expose authenticated provenance that the host can verify before accepting the decision, for example a signed DecisionReceipt or equivalent authenticated response bound to a trusted verification key and the exact execution intent. The host must fail closed when provenance cannot be authenticated.

This mock does not attempt to define that remote cryptographic protocol.

## Terminal revalidation

After a valid contextual `allow`, and immediately before signing, the host re-reads and revalidates:

- the final exact delegated action;
- wallet nonce and action identity;
- wallet policy version and policy hash;
- all deterministic `BoundedAgentWallet` constraints relevant to the action;
- the decision expiry after the terminal wallet check;
- the action expiry after the terminal wallet check.

If anything changed or expired, the prior decision is not reused. A new exact proposal requires a new decision.

## Atomic single-use boundary

The decision ID is consumed only after all terminal checks pass, and that consume operation must be atomic.

The included mock uses a process-local lock-backed consumer so concurrent calls cannot both consume the same decision ID. This is sufficient only for the isolated example. A real multi-worker integration must use a durable shared atomic store that survives worker boundaries and process restarts.

## Authority rule

The contextual decision is monotonic/subordinate:

```text
existing wallet authority AND contextual ALLOW -> may proceed to signing
existing wallet hard denial AND contextual ALLOW -> deny
REVIEW_REQUIRED -> no signing now
BLOCK -> no signing
provider uncertainty/failure -> no signing
expired decision/action -> no signing
replayed/already-consumed decision -> no signing
```

An InterAI `allow` can never create target, amount, verifier, action, nonce, or policy authority that the wallet did not already grant.
