# Architecture and Authority Boundary

InterAI is designed as an independent decision layer between a proposed agent action and the system that can actually execute it.

```text
agent / workflow proposes action
            |
            v
         InterAI
   normalize + evaluate
   policy composition
   decision + receipt
            |
     +------+------+
     |      |      |
   ALLOW  REVIEW  BLOCK
     |      |      |
     v      v      v
 execution / route / abort
```

The execution system remains responsible for enforcing the returned authority decision. InterAI does not perform the consequential action itself.

## Authority order

Authenticated autonomous requests compose policy in this order:

```text
HOST -> ACCOUNT -> CALLER -> EFFECTIVE
```

- **HOST** is an InterAI-controlled irreducible floor.
- **ACCOUNT** is a versioned policy profile resolved after the authenticated account is known.
- **CALLER** is request-scoped policy supplied with the proposed action.
- **EFFECTIVE** is the stricter composition used for the decision.

A lower-authority layer cannot weaken a higher-authority restriction. Accountless/x402 requests have no account profile and therefore use `HOST -> CALLER -> EFFECTIVE`.

## External evidence boundary

InterAI can ingest verifiable assertions produced outside the deciding system while preserving a separate execution-authority boundary.

**External evidence. Internal authority.**

```text
external provider
       |
       | assertion
       v
     InterAI
  parse
  verify
  bind
  record
       |
       v
policy authority boundary
       |
   +---+---+
   |   |   |
ALLOW REVIEW BLOCK
```

The key rule is:

**The provider asserts. InterAI decides authority.**

An external provider can contribute evidence about a domain, asset, transaction, counterparty, or other execution-relevant state. InterAI can verify the supported authenticity scheme, validate the evidence contract, establish whether the evidence is current and applicable, bind it to the relevant action/context, and record the verification result.

That does **not** make the provider an execution authority.

A provider-level verdict such as `PASS`, `CAUTION`, or `BLOCK` remains a provider assertion. It does not directly map to InterAI `ALLOW`, `REVIEW_REQUIRED`, or `BLOCK`, and it does not bypass the host/account/caller policy hierarchy.

This separation prevents a useful source of domain evidence from silently becoming a policy authority merely because its data is cryptographically verifiable.

The current external-evidence contract is deliberately narrow and non-authoritative. Any future design that gives external evidence authority-bearing semantics, or that resolves evidence through live network references, requires an explicit new trust-boundary decision rather than an implicit extension of the current model.

See [external-evidence.md](external-evidence.md).

## What InterAI is responsible for

InterAI is responsible for:

- evaluating a proposed action before execution;
- applying the authoritative policy composition that is available for that request;
- validating and binding supported external evidence without implicitly delegating execution authority;
- returning `allow`, `review_required`, or `block`;
- exposing machine-readable policy findings and execution-risk signals;
- issuing durable trust-receipt evidence when required;
- keeping decision identity compatible with idempotent retries.

## What InterAI is not responsible for

InterAI does not replace:

- authentication or identity systems;
- the caller's permission model;
- domain-specific medical, legal, financial, safety, or compliance review;
- transaction execution or tool invocation;
- universal factual truth verification;
- an execution layer that actually honors the decision.

InterAI also does not treat a cryptographically valid external assertion as proof that the provider should control the execution decision.

A design where the same gated agent can ignore a `block` and invoke the real side effect directly is not an enforcement boundary.

## Trust receipts

A trust receipt is evidence of the decision InterAI made for a particular verification context. Authenticated autonomous receipts can bind host, account, caller, and effective-policy provenance so policy changes are not hidden side configuration.

Where supported, external-evidence verification can be recorded separately from the InterAI authority decision so the provenance of an assertion is not confused with the authority of the final decision.

Current receipt signatures use HMAC-SHA256 and are service-verifiable by InterAI. They are not presented as independently verifiable public-key signatures.

## Failure posture

The intended posture for incomplete or ambiguous consequential actions is conservative: missing critical action information should not silently become permission to execute. Depending on the applicable policy and request state, the result can require review or block execution.

For irreversible or externally consequential actions, the execution layer should treat `review_required` as **not authorized for autonomous execution**.

External evidence follows the same principle: malformed, expired, unbound, unverifiable, or unresolved evidence must not silently become trusted execution context.

## Public / private boundary

This repository publishes the integration contract: schemas, SDK source, examples, discovery metadata, protocol surfaces, and documentation.

The hosted verification implementation, scoring internals, billing infrastructure, signing secrets, private persistence, and deployment configuration remain proprietary.

That split is deliberate: the public contract should be inspectable enough to integrate and reason about the boundary without publishing the production implementation itself.

## See it operate

- Action Boundary Lab: https://ai-risk-oracle.fly.dev/lab
- Controlled safe demo: https://ai-risk-oracle.fly.dev/demo
- OpenAPI: https://ai-risk-oracle.fly.dev/.well-known/openapi.json
- MCP remote: https://ai-risk-oracle.fly.dev/mcp
- Policy details: [policies.md](policies.md)
- External evidence: [external-evidence.md](external-evidence.md)
- Trust receipts: [trust-receipts.md](trust-receipts.md)
