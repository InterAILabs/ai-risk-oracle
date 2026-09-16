# Public Open-Source Tool Boundary

This document defines what may be published as reusable InterAI tooling without exposing the private Risk Oracle decision engine.

## Public by design

The public surface may contain:

- API clients and SDKs that call the hosted service;
- external request/response schemas and discovery metadata;
- framework/protocol adapters that enforce the public decision contract;
- fail-closed action-gate helpers;
- deterministic client-side action-binding helpers;
- receipt consumers that use public receipt fields and public verification endpoints;
- synthetic fixtures, compatibility tests and reference integrations;
- documentation required to integrate safely with the hosted service.

Public code must be independently understandable from public contracts. It must not require importing files from the private core.

The reusable code under `toolkit/` is separately licensed under Apache-2.0. The rest of this repository remains governed by the root `LICENSE` unless another path contains an explicit separate license.

## Private by design

The following remain private unless a later explicit publication decision says otherwise:

- production verification and native decision-engine implementation;
- heuristic/scoring internals and trust intelligence;
- host-policy implementation details that are not already part of a public contract;
- production database/store internals and account data;
- billing, settlement and top-up internals beyond public API contracts;
- receipt-signing secrets, key material and private signing implementation;
- admin/control-room internals and private operational telemetry;
- operator campaign plans, submission trackers, adoption-monitor configuration and internal distribution state;
- private deployment configuration, credentials, secrets and incident tooling;
- research/shadow internals that are not yet a supported public contract.

## One-way dependency rule

Public integration code may depend only on public HTTP contracts, public schemas, public open-source packages, and standard/runtime libraries.

The private core may implement those public contracts, but no public tool may require copying or importing private engine logic. A useful public tool should remain usable even when hosted engine internals evolve behind a stable contract.

## Publication gate

Before moving a helper into the public/open-source surface, verify all of the following:

1. It is integration/enforcement logic, not proprietary decision logic.
2. It contains no production data, credentials, secrets, private addresses or internal endpoints.
3. Its tests use synthetic fixtures only.
4. Its claims match the currently deployed/publicly documented contract.
5. Failure semantics are explicit; consequential execution fails closed where the helper owns the boundary.
6. Receipt helpers preserve the current service-verifiable scope and do not imply independent verification.
7. Publishing it does not expose scoring weights, private policy floors, trust intelligence, billing internals or signing internals.

## Standalone repository policy

A focused standalone repository is a distribution surface, not a second implementation of Risk Oracle. We may create one proactively when the tool already has a stable public contract and a dedicated repository materially improves discovery, explanation, contribution or installation.

The initial standalone identities are:

- `InterAILabs/agent-action-gate`
- `InterAILabs/exact-action-binding`
- `InterAILabs/decision-receipts`

A satellite repository must:

- contain only code that passes the publication gate above;
- identify Risk Oracle as a related hosted decision service without claiming that the tool itself is the private engine;
- remain usable from public code/contracts only;
- have its own focused README, tests, CI and open-source license;
- avoid duplicating private logic or operational state;
- keep a clear canonical-source/release relationship with the public Risk Oracle hub.

Repository count is not itself an adoption metric. The purpose of the satellites is to expose concrete problems developers already search for through several small entry points into one coherent authority ecosystem.
