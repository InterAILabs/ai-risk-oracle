# MCP Registry Submission Package

## Channel

MCP Registry:

```text
https://modelcontextprotocol.io/registry
```

## Status

`validated_authentication_pending`

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
- Release URL: https://github.com/InterAILabs/ai-risk-oracle/releases/tag/v0.1.0-beta
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
https://github.com/InterAILabs/ai-risk-oracle/releases/tag/v0.1.0-beta
```

## Beta Scope

The submission artifact exists and passed `mcp-publisher v1.8.1 validate` on
2026-08-24. Publication and Registry API confirmation remain pending.

## What Not To Claim

- Do not claim InterAI is in the MCP Registry.
- Do not publish to the registry without namespace authentication.
- Do not claim a listing until the Registry API returns the exact server/version.
- Public discovery and pricing tools are unauthenticated; billable verification
  requires a credential or supported payment path.
- Do not change core MCP behavior from public docs.

## Exact Next Action

1. Authenticate with GitHub for the `InterAILabs` organization namespace.
2. Publish `server.json` with `mcp-publisher`.
3. Query the Registry API for
   `io.github.interailabs/ai-risk-oracle@0.1.2-beta`.
4. Update channel status only after the exact record is returned.
