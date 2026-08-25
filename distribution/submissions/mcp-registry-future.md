# MCP Registry Submission Package

## Channel

MCP Registry:

```text
https://modelcontextprotocol.io/registry
```

## Status

`published_verified`

## Submission Method

Remote `server.json` publish flow with GitHub namespace authentication.

The registry documentation describes remote server publication through a
`server.json` file with a `remotes` property, plus namespace authentication.

## Title

```text
InterAI Risk Oracle MCP
```

## Short Description

```text
Remote MCP access to InterAI Risk Oracle pre-execution verification.
```

## Long Description

```text
InterAI Risk Oracle exposes pre-execution verification for autonomous agents through a hosted Streamable HTTP MCP endpoint, with policy decisions, discovery resources, and trust receipts.
```

## Tags

```text
mcp, autonomous agents, execution gateway, pre-execution verification, policy enforcement, trust receipts, OpenAPI, x402
```

## Links

- Homepage: https://ai-risk-oracle.fly.dev
- GitHub repo: https://github.com/InterAILabs/ai-risk-oracle
- Release URL: https://github.com/InterAILabs/ai-risk-oracle/releases/tag/v0.1.3-beta
- Hosted service URL: https://ai-risk-oracle.fly.dev
- Pricing URL: https://ai-risk-oracle.fly.dev/pricing
- OpenAPI URL: https://ai-risk-oracle.fly.dev/.well-known/openapi.json
- AI service descriptor URL: https://ai-risk-oracle.fly.dev/.well-known/ai-service.json
- Discovery bundle URL: https://ai-risk-oracle.fly.dev/.well-known/discovery-bundle.json
- Autonomous adoption URL: https://ai-risk-oracle.fly.dev/.well-known/autonomous-adoption.json

## Pricing/Self-Serve Path

```text
discover -> pricing -> onboard/API key/trial or x402 -> verify -> decision -> store receipt
```

## OpenAPI URL

```text
https://ai-risk-oracle.fly.dev/.well-known/openapi.json
```

## Autonomous Adoption URL

```text
https://ai-risk-oracle.fly.dev/.well-known/autonomous-adoption.json
```

## Release URL

```text
https://github.com/InterAILabs/ai-risk-oracle/releases/tag/v0.1.3-beta
```

## Beta Scope

The submission artifact passed `mcp-publisher v1.8.1 validate`, was published on
2026-08-25, and the official Registry API returned the exact server/version.

## What Not To Claim

- Claim only the exact published server/version returned by the Registry API.
- Authenticate the `InterAILabs` namespace again before publishing later versions.
- Public discovery and pricing tools are unauthenticated; billable verification
  requires a credential or supported payment path.
- Do not change core MCP behavior from public docs.

## Exact Next Action

1. Monitor the exact Registry API record.
2. Keep `server.json` and the public release version aligned.
3. Revalidate and publish only when a later release is ready.
