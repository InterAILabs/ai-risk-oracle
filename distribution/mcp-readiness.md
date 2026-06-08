# MCP Readiness

InterAI Risk Oracle exposes MCP-compatible metadata and tools through the hosted
service.

## Discovery

- MCP endpoint: `POST https://ai-risk-oracle.fly.dev/mcp`
- Service descriptor: `oracle.service_descriptor`
- Agent card: `oracle.agent_card`
- Discovery bundle: `oracle.discovery_bundle`
- Pricing: `oracle.get_pricing`

## Verification Tooling

The MCP path is intended to preserve the autonomous execution contract:

- Request contract: `autonomous_execution`
- Decision fields: `recommended_action`, `policy_result`, `risk_level`, `score`
- Receipt fields: `decision_id`, `trust_receipt_id`
- Signals shape: object

## Operator Check

Before a submission or partner handoff:

1. Fetch `/.well-known/discovery-bundle.json`.
2. Confirm the MCP endpoint is advertised as `/mcp`.
3. Confirm the OpenAPI and agent card links resolve.
4. Confirm the primary narrative is Autonomous Execution Gateway.
5. Confirm legacy compatibility is secondary.

## Current Status

Ready for controlled partner review. Broad traffic should remain gated by the
operational limits documented in `docs/distribution-checklist.md`.

