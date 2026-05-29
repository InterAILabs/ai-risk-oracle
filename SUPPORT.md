# Support

InterAI Risk Oracle is currently in public beta.

## For Integrators

Start with:

- [README.md](README.md)
- [docs/quickstart.md](docs/quickstart.md)
- [docs/api-reference.md](docs/api-reference.md)
- [docs/public-beta-plan.md](docs/public-beta-plan.md)

Live production probes:

```bash
curl -sS https://ai-risk-oracle.fly.dev/health
curl -sS https://ai-risk-oracle.fly.dev/ready
curl -sS https://ai-risk-oracle.fly.dev/pricing
curl -sS https://ai-risk-oracle.fly.dev/.well-known/agent.json
```

## What To Include In Issues

For bugs:

- endpoint or example used
- request shape without secrets
- response status and redacted response body
- expected behavior
- actual behavior
- whether the issue affects HTTP, x402, MCP, A2A, SDK, receipts, billing, or
  top-ups

For integration help:

- target runtime or agent framework
- whether you are using bearer prepaid billing or x402
- whether you need HTTP, MCP, A2A, TypeScript SDK, or Python client
- what decision you want to gate: tool execution, payment, storage, or user
  delivery

## Security

For vulnerabilities, do not open a public issue with exploit details. Follow
[SECURITY.md](SECURITY.md).
