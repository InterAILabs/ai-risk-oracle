# InterAI Public Toolkit

Small, framework-neutral integration primitives for placing a hard decision boundary immediately before consequential agent actions.

The toolkit is intentionally **not** the InterAI decision engine. It contains client-side enforcement and interoperability helpers that can be inspected, copied, tested, and embedded without exposing proprietary verification, scoring, billing, signing, trust-intelligence, or production-service internals.

## Primitives

### Action Gate

`action-gate/` wraps a proposed action, an external decision provider, and the side effect itself. Only an unambiguous `allow` reaches `execute`. `review_required`, `block`, timeout, provider failure, malformed/unknown decisions, contradictory authority fields, or action mutation all stop execution.

This is the generic pattern behind framework-specific adapters such as CrewAI and Mastra.

### Exact Action Binding

`exact-action-binding/` creates deterministic SHA-256 bindings for JSON-compatible action objects. Object keys are canonicalized; arrays retain order; unsupported or ambiguous JS values are rejected.

Use it to prove that the action about to execute is the same action that was submitted for a decision. This public helper is an integration primitive, not the hosted InterAI canonical execution-intent protocol.

### Decision Receipts

`decision-receipts/` handles the public receipt-verification boundary. It rejects anonymous `public_summary` lookups as authorization evidence, can assert an exact `execution_intent_digest`, and forwards the opaque `signed_payload` unchanged to InterAI's service-verification endpoint.

Current HMAC receipts are service-verifiable. This toolkit does not claim independent offline public-key verification.

## Run the tests

No package install is required:

```bash
node --test toolkit/*/*.test.mjs
```

## Framework and protocol adapters

Use these primitives directly, or start from the maintained integration examples:

- CrewAI: `examples/framework-integrations/crewai/`
- Mastra: `examples/framework-integrations/mastra/`
- OpenAI Agents SDK: `examples/framework-integrations/openai-agents/`
- Google ADK: `examples/framework-integrations/google-adk/`
- Agent Bounties mock adapter: `examples/protocol-integrations/agent-bounties/`

## Promotion policy

These primitives incubate together in this repository first. A primitive should become its own package or repository only when it has a stable independent contract and real external usage that creates separate release/versioning pressure. We intentionally avoid creating many empty repositories before adoption exists.

See `docs/public-toolkit-boundary.md` for the public/private publication boundary.
