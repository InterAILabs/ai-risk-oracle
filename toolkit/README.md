# InterAI Open Source Tools

Small, framework-neutral tools for placing a hard decision boundary immediately before consequential agent actions.

These tools are intentionally **not** the InterAI decision engine. They contain client-side enforcement and interoperability logic that can be inspected, reused, modified and distributed without exposing proprietary verification, scoring, policy, billing, signing, trust-intelligence or production-service internals.

The code under `toolkit/` is licensed under Apache-2.0. See [`LICENSE`](LICENSE) and [`NOTICE`](NOTICE).

## Tools

### Action Gate

`action-gate/` wraps a proposed action, an external decision provider, and the side effect itself. Only an unambiguous `allow` reaches `execute`. `review_required`, `block`, timeout, provider failure, malformed/unknown decisions, contradictory authority fields, or action mutation all stop execution.

The default authority reader implements InterAI's documented `recommended_action` + `policy_result` contract. Action Gate composes with Exact Action Binding for host-side mutation detection.

### Exact Action Binding

`exact-action-binding/` creates deterministic SHA-256 bindings for JSON-compatible action objects. Object keys are canonicalized; arrays retain order; unsupported or ambiguous JavaScript values are rejected.

Use it to prove that the action about to execute is the same action that was bound earlier. This public helper is deliberately distinct from InterAI's hosted `CanonicalExecutionIntent`, `execution_intent_digest`, `ExecutionAuthorization`, policy identity, expiry and single-use protocol.

### Decision Receipts

`decision-receipts/` handles InterAI's public receipt-verification boundary. It rejects anonymous `public_summary` lookups as authorization evidence, can assert an exact `execution_intent_digest`, and forwards the opaque `signed_payload` unchanged to InterAI's service-verification endpoint.

Current InterAI HMAC receipts are service-verifiable by InterAI. This tool does not claim independent offline public-key verification.

## Run the tests

No package install is required:

```bash
node --test toolkit/*/*.test.mjs
```

## Framework and protocol adapters

Use these tools directly, or start from the maintained integration examples:

- CrewAI: `examples/framework-integrations/crewai/`
- Mastra: `examples/framework-integrations/mastra/`
- OpenAI Agents SDK: `examples/framework-integrations/openai-agents/`
- Google ADK: `examples/framework-integrations/google-adk/`
- Agent Bounties mock adapter: `examples/protocol-integrations/agent-bounties/`

## Standalone repository model

InterAI uses a hub-and-satellites model:

- `InterAILabs/ai-risk-oracle` remains the public product, contract, SDK and integration hub for Risk Oracle.
- selected stable tools may also live in focused standalone repositories for independent discovery, contribution and release identity;
- standalone tools depend only on public code/contracts and never import the private core;
- the hosted decision engine remains behind `https://api.interailabs.dev`.

The first standalone repository identities are:

- `InterAILabs/agent-action-gate`
- `InterAILabs/exact-action-binding`
- `InterAILabs/decision-receipts`

Until a standalone repository is published, the corresponding directory here remains the canonical source. Once a satellite repository exists, its README must identify its relationship to Risk Oracle and this hub explicitly; no private-core implementation is copied into it.

See `docs/public-toolkit-boundary.md` for the public/private publication boundary.
