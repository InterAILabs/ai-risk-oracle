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
              +-- changed/stale/replayed/hard deny -> stop
              |
              v
        delegated signing may proceed
```

This draft does **not**:

- modify `BoundedAgentWallet` storage or bytecode;
- introduce an on-chain InterAI hook;
- alter owner-approved caps, verifier constraints, targets, delegate authority, nonce rules, or signing authority;
- contain production wallet addresses, private keys, signing material, or live transaction data;
- claim that a DecisionReceipt proves execution.

## Files

- `INTERFACE.md` — exact host/decision binding contract and authority rule.
- `adapter.py` — dependency-free deterministic mock adapter.
- `test_adapter.py` — focused fail-closed test suite.
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

Only a valid `allow` from the configured issuer can reach the terminal revalidation step.

The adapter stops before signing on:

- `block`;
- `review_required`;
- timeout;
- provider/transport failure;
- malformed response;
- unknown issuer;
- expired/invalid decision lifetime;
- replayed decision id;
- action/digest mismatch;
- action mutation after evaluation;
- stale/replaced wallet policy;
- deterministic wallet hard denial, both before evaluation and immediately before signing.

`review_required` never falls through to execution. An `allow` never overrides a deterministic denial.

## Deterministic wallet revalidation

The example accepts a host-owned `deterministic_policy_allows(action, policy)` callback. That callback represents the existing Agent Bounties / BoundedAgentWallet checks; InterAI does not replace them.

The callback is run before the contextual decision and again at the terminal boundary. The adapter also re-reads the exact action and policy snapshot immediately before signing. Any mutation or policy rotation invalidates the earlier decision.

For a real host integration, the revalidation should pin and re-check the complete live wallet policy needed by the action, including policy version/hash and the existing canonical target, verifier, cap, nonce, and deadline rules.

## Run the synthetic proof

Python 3.10+; no third-party dependencies:

```bash
cd examples/protocol-integrations/agent-bounties
python -m unittest -v
```

The suite currently covers 15 cases:

1. baseline disabled;
2. valid allow;
3. block;
4. review required;
5. timeout;
6. malformed response;
7. unknown issuer;
8. stale policy version;
9. exact action binding mismatch;
10. expired decision;
11. replay;
12. action mutation after allow;
13. policy change after allow;
14. contextual allow cannot override a wallet hard denial;
15. terminal deterministic revalidation can veto an earlier allow.

All addresses and values in the tests are synthetic.

## Adoption status

This is a compatibility proof for maintainer evaluation, not an approved Agent Bounties integration and not a funded implementation. No change to the Agent Bounties repository or deployed wallets is proposed by this draft.
