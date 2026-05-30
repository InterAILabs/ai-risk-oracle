# Discovery

Discovery metadata lets agents and developer tools understand the hosted
InterAI Risk Oracle service without scraping documentation.

Public discovery files live in [../discovery](../discovery):

- `ai-service.json`
- `agent.json`
- `openapi.json`
- `mcp.json`
- `a2a-card.json`

The metadata intentionally describes public contracts only. It excludes backend
internals, private scoring logic, deployment details, secrets, and databases.

