# Agent Bounties bounded off-chain decision adapter

This is a bounded interoperability draft for [NSPG13/agent-bounties issue #1409](https://github.com/NSPG13/agent-bounties/issues/1409).

It tests one narrow question: can an independent contextual decision gate sit immediately before delegated signing **without changing `BoundedAgentWallet` authority or deployed contracts**?

The answer demonstrated here is yes, provided the host treats the decision as subordinate to the wallet's deterministic policy and fails closed on every non-authorizing or uncertain result.

## Boundary

```text
agent proposes exact delegated action
        |
        v
existing Agent Bounties / BoundedAgentWallet deterministic checks
        |
        v
build exact off-chain binding
(chain, wallet, delegate, target, calldata hash, token/amount,
 nonce, expiry, policy version + policy hash)
        |
        v
InterAI / deterministic mock decision provider
        |
        +-- BLOCK ----------------------> stop
        +-- REVIEW_REQUIRED ------------> stop pending explicit owner review
        +-- timeout / bad / unknown ----> stop
        |
        +-- ALLOW
              |
              v
terminal re-read + deterministic wallet policy revalidation
              |
              v
recheck decision + action expiry
              |
              v
atomic single-use decision consume
              |
              +-- changed/stale/expired/replayed/hard deny -> stop
              |
              v
        delegated signing may proceed
```

This draft does **not**:

- modify `BoundedAgentWallet` storage or bytecode;
- introduce an on-chain InterAI hook;
- alter owner-approved caps, verifier constraints, targets, delegate authority, nonce rules, or signing authority;
- contain production wallet addresses, private keys, signing material, or live transaction data;
- claim that a DecisionReceipt proves execution;
- claim that matching an `issuer` string authenticates a remote decision provider.

## Files

- `INTERFACE.md` — exact host/decision binding, provider-authentication boundary, atomic consume requirement, and authority rule.
- `adapter.py` — dependency-free deterministic mock adapter with process-local atomic single-use consumption.
- `test_adapter.py` — focused fail-closed and concurrency test suite.
- `fixtures.json` — synthetic fixture values only.

## What is bound

Every decision is tied to the exact:

- `chain_id`;
- wallet;
- caller/delegate;
- target;
- calldata hash;
- token and amount;
- wallet nonce;
- action expiry;
- wallet policy version;
- wallet policy hash.

The adapter computes a deterministic SHA-256 `execution_intent_digest` over the canonical binding. An `allow` for one binding cannot authorize another.

## Fail-closed semantics

Only a valid `allow` from the configured trusted mock issuer can reach the terminal revalidation step.

The adapter stops before signing on:

- `block`;
- `review_required`;
- timeout;
- provider/transport failure;
- malformed response;
- unknown issuer;
- expired/invalid decision lifetime;
- expired action;
- replayed/already-consumed decision id;
- action/digest mismatch;
- action mutation after evaluation;
- stale/replaced wallet policy;
- deterministic wallet hard denial, both before evaluation and immediately before signing.

`review_required` never falls through to execution. An `allow` never overrides a deterministic denial.

## Final handoff and replay safety

The adapter re-checks both decision expiry and action expiry **after** the terminal deterministic wallet-policy validation and immediately before the single-use decision consume.

The consume operation is atomic in this mock: `AtomicDecisionConsumer` uses a process-local lock so two concurrent calls using the same decision ID cannot both return `allow`.

A production integration cannot rely on an in-memory lock/set across multiple workers or restarts. It needs a durable shared atomic consume primitive.

## Provider authentication

`issuer == "interai:test"` is intentionally sufficient only for this trusted local/mock fixture. An issuer string by itself is not authenticated provenance.

A future remote InterAI response must be authenticated before the host treats it as authorizing—for example via a signed DecisionReceipt or equivalent authenticated response bound to a trusted verification key and the exact execution intent. Failure to authenticate provenance must fail closed.

## Deterministic wallet revalidation

The example accepts a host-owned `deterministic_policy_allows(action, policy)` callback. That callback represents the existing Agent Bounties / `BoundedAgentWallet` checks; InterAI does not replace them.

The callback is run before the contextual decision and again at the terminal boundary. The adapter also re-reads the exact action and policy snapshot immediately before signing. Any mutation or policy rotation invalidates the earlier decision.

For a real host integration, the revalidation should pin and re-check the complete live wallet policy needed by the action, including policy version/hash and the existing canonical target, verifier, cap, nonce, and deadline rules.

## Run the synthetic proof

Python 3.10+; no third-party dependencies:

```bash
cd examples/protocol-integrations/agent-bounties
python -m unittest -v
```

The suite currently covers 19 cases, including:

- baseline disabled and valid allow;
- block and review required;
- timeout and malformed response;
- unknown issuer;
- stale policy and exact action binding mismatch;
- expired decision and expired action;
- sequential replay;
- action and policy mutation after allow;
- wallet hard denial and terminal deterministic veto;
- decision expiry during the final wallet check;
- action expiry during the final wallet check;
- concurrent replay where exactly one call succeeds.

All addresses and values in the tests are synthetic.

## Adoption status

This is a compatibility proof under maintainer review, not an approved Agent Bounties integration and not a funded implementation. No change to the Agent Bounties repository or deployed wallets is proposed by this draft.
