# v0.1.3-beta — Canonical pricing and Base Mainnet facilitator readiness

InterAI Risk Oracle `v0.1.3-beta` migrates every current billing and discovery
surface to one canonical economic model.

Current pricing:

- fast heuristic: `0.010000 USDC` (`10,000` microusdc);
- semantic judge: `0.030000 USDC` (`30,000` microusdc);
- batch: `0.010000 USDC` base plus `0.005000 USDC` per item;
- demo trial: isolated `0.050000 USDC` credit with the existing five-call cap.

Runtime prepaid debits, x402 payment requirements, `/pricing`, discovery, MCP,
docs, and SDK metadata are aligned. Regression tests reject legacy prices in
current public artifacts while retaining historical release notes unchanged.

The release also prepares authenticated Coinbase CDP facilitator support for
Base Mainnet. Production settlement requires operator-provided CDP credentials
stored as runtime secrets; no wallet or private key is changed.

Live pricing: https://ai-risk-oracle.fly.dev/pricing

MCP remote: https://ai-risk-oracle.fly.dev/mcp

OpenAPI: https://ai-risk-oracle.fly.dev/.well-known/openapi.json
