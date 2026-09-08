# External Evidence

InterAI separates **what an external system can assert** from **who has authority over the execution decision**.

## External evidence. Internal authority.

> The provider asserts. InterAI decides authority.

Autonomous systems increasingly depend on information produced outside the component that makes the final execution decision. A domain-specific provider may know something important about an asset, transaction, counterparty, environment, or other execution-relevant state.

InterAI can accept that information as verifiable evidence without automatically granting the provider control over `ALLOW`, `REVIEW_REQUIRED`, or `BLOCK`.

```text
external provider
      |
      | signed / verifiable assertion
      v
   InterAI
parse -> verify -> bind -> record
      |
      v
InterAI policy boundary
      |
      +--> ALLOW
      +--> REVIEW_REQUIRED
      +--> BLOCK
```

## What InterAI verifies

For a supported external-evidence item, InterAI can establish whether the evidence:

- conforms to the expected closed contract;
- uses the expected schema/version and evaluation scope;
- is authentic under the supported signing or attestation scheme;
- is still within its validity window;
- is bound to the relevant subject, action, and context;
- can be recorded with provenance separate from the InterAI decision.

Verification establishes whether InterAI can trust the evidence **as an assertion from that provider**. It does not establish that the provider owns the execution decision.

## Assertion is not authority

A provider may emit a domain verdict such as:

```text
PASS
CAUTION
BLOCK
```

Those values remain part of the provider assertion.

They do not directly become:

```text
ALLOW
REVIEW_REQUIRED
BLOCK
```

inside InterAI.

The final InterAI decision continues to be produced under InterAI’s own authority boundary and effective policy composition.

This distinction is intentional. Cryptographic authenticity answers **who produced this evidence and whether it was altered**. It does not answer **who should be allowed to decide whether the autonomous action executes**.

## Why the boundary matters

Without this separation, adding a useful external data source can quietly become authority delegation.

That creates a different system architecture: one where a third party can indirectly control execution merely by issuing a provider-level verdict.

InterAI instead treats external evidence as one input into a bounded pre-execution verification flow while keeping provider provenance and execution authority conceptually and operationally separate.

## Current scope

The current external-evidence boundary is intentionally narrow and non-authoritative.

The supported model is:

```text
parse -> verify -> bind -> record
```

It is not presented as:

- an unrestricted remote-fetch mechanism;
- delegated policy administration;
- external-provider execution authority;
- universal factual truth verification;
- a replacement for domain-specific human or institutional review.

Live reference resolution or any future authority-bearing use of external evidence would require a separate design with an explicit origin, interface, credential, resolver, and trust boundary.

## Relationship to the InterAI decision layer

The broader InterAI architecture remains:

```text
Identity / authentication
        |
Permissions / deterministic limits
        |
External evidence verification
  (when evidence is present)
        |
InterAI authority + policy boundary
        |
ALLOW / REVIEW_REQUIRED / BLOCK
        |
Execution / escalation / abort
```

External evidence expands what InterAI can verify before execution. It does not change who owns the final InterAI authority decision.

## Related documentation

- [Architecture and authority boundary](architecture.md)
- [Policy semantics](policies.md)
- [Trust receipts](trust-receipts.md)
- [Integration patterns](integration-patterns.md)
