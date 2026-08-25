# Pricing Review

The hosted pricing endpoint is the canonical public source:

```text
https://ai-risk-oracle.fly.dev/pricing
```

## Current Beta Pricing

- `fast_heuristic`: `0.010000 USDC` (`10,000` microusdc) per verification.
- `semantic_judge`: `0.030000 USDC` (`30,000` microusdc) per verification.
- `verify_batch`: `0.010000 USDC` base plus `0.005000 USDC` per item.
- Batch examples: 1 item `0.015000`, 10 items `0.060000`, 100 items `0.510000` USDC.
- Network and asset: Base Mainnet USDC.

The isolated demo trial provides `0.050000 USDC` of non-withdrawable credit and
retains a separate five-verification limit. The default recommended standard
top-up is `0.100000 USDC`.

Production x402 settlement on Base Mainnet requires an explicitly configured
mainnet facilitator. Consult the hosted `/pricing` facilitator metadata before
assuming settlement availability.
