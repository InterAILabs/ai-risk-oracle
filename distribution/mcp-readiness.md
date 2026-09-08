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

The MCP path preserves the primary pre-execution decision contract:

- Request contract: `autonomous_execution`
- Decision fields: `recommended_action`, `policy_result`, `risk_level`, `score`
- Receipt fields: `decision_id`, `trust_receipt_id`
- Signals shape: object
- InterAI does not execute the external action

## Operator Check

Before a submission or partner handoff:

1. Fetch `/.well-known/discovery-bundle.json`.
2. Confirm the MCP endpoint is advertised as `/mcp`.
3. Confirm the OpenAPI and agent card links resolve.
4. Confirm the primary narrative is **Independent pre-execution decision layer for consequential agent actions**.
5. Confirm the service does not claim to execute the external action.
6. Confirm legacy compatibility is secondary.
7. Verify the live MCP Registry/listing status before making any current placement claim.

## Current Status

The public repository contains the MCP Registry descriptor for
`io.github.InterAILabs/ai-risk-oracle@0.1.3-beta`, pointing to the hosted
Streamable HTTP endpoint.

External monitoring observed the endpoint healthy with 9 tools in late August / early
September 2026. Treat third-party listing state and scores as time-sensitive: verify them
again immediately before publication, outreach, or a registry claim rather than copying a
historical status into current marketing material.

## 2026-09-07 Runtime Copy Revalidation

The remaining hosted MCP copy gate was cleared in production at core commit
`bdda078784e02e2bc544aaac9b07ac2cc23e8d2b`.

The service descriptor and agent-card descriptions now use the current independent
pre-execution decision-layer positioning. CI #140 and Fly deploy #50 completed successfully,
including the production health, contract, billing, and receipt smoke.

There is no remaining MCP runtime-copy blocker for distribution. Registry placement,
third-party health scores, and ownership/analytics status are external and time-sensitive and
must still be rechecked before claims.
