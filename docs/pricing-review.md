# Pricing Review

This document records the current beta pricing decision for distribution
readiness. It does not change runtime pricing, x402 behavior, billing logic, or
wallet configuration.

## Current Beta Price

```text
0.0006 USDC/request
600 microusdc/request
Base USDC
```

Use the hosted pricing endpoint as the source of truth:

```text
https://ai-risk-oracle.fly.dev/pricing
```

## Decision

Keep the current beta price during early distribution.

Reasons:

- the price is low enough for technical testers to try the gateway quickly;
- it supports both prepaid API key and x402 adoption flows;
- changing price now would create noise while directory submission and
  telemetry baselines are still being established;
- the current value is already reflected in hosted metadata and public
  distribution assets.

## Risks To Monitor

- abuse or scripted high-volume usage during beta;
- infrastructure and support cost if traffic grows faster than expected;
- future semantic-judge or heavier verification modes with higher compute cost;
- x402/top-up edge cases that increase support load;
- confusion if directories copy a static price instead of linking to `/pricing`.

## Future Tier Options

- keep fast heuristic verification as the lowest-cost tier;
- add a higher-cost semantic verification tier only after explicit operator
  approval;
- add volume packages once telemetry shows recurring usage;
- add enterprise/manual support terms separately from default self-serve access.

## Files To Review Before Any Future Price Change

- hosted pricing metadata;
- x402 payment requirement metadata;
- onboarding/trial copy;
- public discovery descriptors;
- README and quickstart pricing references;
- distribution submission assets;
- release notes.

Do not change pricing, x402 logic, wallet configuration, billing behavior, or
trial policy without explicit human approval.
