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

## What InterAI is responsible for

InterAI is responsible for:

- evaluating a proposed action before execution;
- applying the authoritative policy composition that is available for that request;
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

A design where the same gated agent can ignore a `block` and invoke the real side effect directly is not an enforcement boundary.

## Trust receipts

A trust receipt is evidence of the decision InterAI made for a particular verification context. Authenticated autonomous receipts can bind host, account, caller, and effective-policy provenance so policy changes are not hidden side configuration.

Current receipt signatures use HMAC-SHA256 and are service-verifiable by InterAI. They are not presented as independently verifiable public-key signatures.

## Failure posture

The intended posture for incomplete or ambiguous consequential actions is conservative: missing critical action information should not silently become permission to execute. Depending on the applicable policy and request state, the result can require review or block execution.

For irreversible or externally consequential actions, the execution layer should treat `review_required` as **not authorized for autonomous execution**.

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
- Trust receipts: [trust-receipts.md](trust-receipts.md)
