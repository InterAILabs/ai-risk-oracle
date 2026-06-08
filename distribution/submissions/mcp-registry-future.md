# MCP Registry Future Package

## Channel

MCP Registry:

```text
https://modelcontextprotocol.io/registry
```

## Status

`blocked_needs_mcp_server`

## Submission Method

Future `server.json` publish flow with authentication.

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
InterAI Risk Oracle exposes pre-execution verification for autonomous agents. A future MCP Registry submission should describe the hosted MCP endpoint, available verification tool, discovery resources, authentication requirements, and the autonomous execution decision contract.
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

MCP metadata/readiness exists, but this is not yet a full MCP Registry
submission.

## What Not To Claim

- Do not claim InterAI is in the MCP Registry.
- Do not claim MCP Registry readiness until `server.json` is created and
  validated.
- Do not publish to the registry without namespace authentication.
- Do not imply unauthenticated MCP access if the endpoint requires credentials.
- Do not change core MCP behavior from public docs.

## Exact Next Action

1. Confirm the hosted MCP endpoint transport expected by the current registry.
2. Create a registry-specific `server.json` in a separate implementation pass.
3. Validate it against the current MCP Registry schema.
4. Choose namespace:
   - GitHub namespace if publishing under `io.github.InterAILabs/...`.
   - Custom domain namespace only after `oracle.interailabs.com` or another
     owned domain is live.
5. Authenticate and publish only after explicit operator approval.
