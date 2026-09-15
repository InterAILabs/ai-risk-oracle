# Discovery

Discovery metadata lets agents and developer tools understand the hosted
InterAI Risk Oracle service without scraping documentation.

Public discovery files live in [../discovery](../discovery):

- `ai-service.json` — general hosted-service descriptor
- `agent.json` — legacy A2A compatibility card
- `a2a-card.json` — A2A 1.0 card mirroring the hosted `/.well-known/agent-card.json`
- `mcp.json` — MCP endpoint and tool-selection guidance
- `openapi.json` — public HTTP API contract
- `autonomous-adoption.json` — machine-readable guidance for choosing InterAI before execution

The A2A 1.0 discovery path is:

```text
https://api.interailabs.dev/.well-known/agent-card.json
```

The public `a2a-card.json` is kept in sync with that hosted contract and declares
the JSON-RPC 1.0 interface, authentication requirement, media modes, and current
verification skills. New integrations should prefer the A2A 1.0 card over the
legacy `agent.json` compatibility surface.

The metadata intentionally describes public contracts only. It excludes backend
internals, private scoring logic, deployment details, secrets, and databases.
