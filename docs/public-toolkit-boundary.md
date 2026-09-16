# Public Toolkit Boundary

This document defines what belongs in the public InterAI repository as the toolkit grows.

## Public by design

The public repository may contain:

- API clients and SDKs that call the hosted service;
- external request/response schemas and discovery metadata;
- framework/protocol adapters that enforce the public decision contract;
- fail-closed action-gate helpers;
- deterministic client-side action-binding helpers;
- receipt consumers that use public receipt fields and public verification endpoints;
- synthetic fixtures, compatibility tests and reference integrations;
- documentation required to integrate safely with the hosted service.

Public code must be independently understandable from public contracts. It must not require importing files from the private core.

## Private by design

The following remain private unless a later explicit publication decision says otherwise:

- production verification and native decision-engine implementation;
- heuristic/scoring internals and trust intelligence;
- host-policy implementation details that are not already part of a public contract;
- production database/store internals and account data;
- billing, settlement and top-up internals beyond public API contracts;
- receipt-signing secrets, key material and private signing implementation;
- admin/control-room internals and private operational telemetry;
- private deployment configuration, credentials, secrets and incident tooling;
- research/shadow internals that are not yet a supported public contract.

## One-way dependency rule

Public integration code may depend only on public HTTP contracts, public schemas, public packages, and standard/runtime libraries.

The private core may implement those public contracts, but no public tool should require copying or importing private engine logic. A useful public primitive should remain useful even when the hosted engine evolves behind the stable contract.

## Publication gate

Before moving a private helper into the public surface, verify all of the following:

1. It is integration/enforcement logic, not proprietary decision logic.
2. It contains no production data, addresses, credentials, secrets or internal endpoints.
3. Its tests use synthetic fixtures only.
4. Its claims match the currently deployed/publicly documented contract.
5. Failure semantics are explicit; consequential execution fails closed where the helper owns the boundary.
6. Receipt helpers preserve the current service-verifiable scope and do not imply independent verification.
7. Publishing it does not expose scoring weights, private policy floors, trust intelligence, billing internals or signing internals.

## When to split into another repository

Keep primitives together under `toolkit/` while they are early and share the InterAI release narrative. Consider a separate package/repository only when at least one of these becomes true:

- multiple external integrations depend on the primitive without needing the rest of Risk Oracle;
- the primitive needs its own release cadence or compatibility matrix;
- external contributors need a focused contribution surface;
- independent installation materially lowers adoption friction.

Repository count is not an adoption metric. The goal is more useful entry points into one coherent authority system, not more empty repositories.
