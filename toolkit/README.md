# InterAI Open Source Tools

Small, framework-neutral tools for placing a hard decision boundary immediately before consequential agent actions.

These tools are intentionally **not** the InterAI decision engine. They contain client-side enforcement and interoperability logic that can be inspected, reused, modified and distributed without exposing proprietary verification, scoring, policy, billing, signing, trust-intelligence or production-service internals.

The code under `toolkit/` is licensed under Apache-2.0. See [`LICENSE`](LICENSE) and [`NOTICE`](NOTICE).

## Live standalone repositories

The first three InterAI tool satellites are now published as focused repositories:

- [Agent Action Gate](https://github.com/InterAILabs/agent-action-gate) — fail-closed execution boundary for consequential AI-agent actions.
- [Exact Action Binding](https://github.com/InterAILabs/exact-action-binding) — deterministic host-side action binding and mutation detection.
- [Decision Receipts](https://github.com/InterAILabs/decision-receipts) — safe consumption and service verification of InterAI decision evidence.

The standalone repositories are the canonical release/contribution surfaces for these tools. The copies under `toolkit/` are compatibility snapshots used by this hub's examples and contract tests; changes to a tool should land in its satellite repository first and then be synchronized here deliberately.

Snapshot provenance is recorded in [`sources.json`](sources.json). CI runs [`check-sources.mjs`](check-sources.mjs) so a compatibility copy cannot be edited silently without updating the recorded source relationship. The check is local and deterministic; it does not add a network dependency to hub CI.

## Tools

### Agent Action Gate

`action-gate/` wraps a proposed action, an external decision provider, and the side effect itself. Only an unambiguous `allow` reaches `execute`. `review_required`, `block`, timeout, provider failure, malformed/unknown decisions, contradictory authority fields, or action mutation all stop execution.

The default authority reader implements InterAI's documented `recommended_action` + `policy_result` contract. The standalone Agent Action Gate composes with Exact Action Binding rather than carrying a second independent binding implementation.

The hub compatibility snapshot intentionally uses a relative import to the local Exact Action Binding snapshot so hub tests remain dependency-free; the standalone repository uses the public Exact Action Binding repository identity.

### Exact Action Binding

`exact-action-binding/` creates deterministic SHA-256 bindings for JSON-compatible action objects. Object keys are canonicalized; arrays retain order; unsupported or ambiguous JavaScript values are rejected.

Use it to prove that the action about to execute is the same action that was bound earlier. This public helper is deliberately distinct from InterAI's hosted `CanonicalExecutionIntent`, `execution_intent_digest`, `ExecutionAuthorization`, policy identity, expiry and single-use protocol.

### Decision Receipts

`decision-receipts/` handles InterAI's public receipt-verification boundary. It rejects anonymous `public_summary` lookups as authorization evidence, can assert an exact `execution_intent_digest`, and forwards the opaque `signed_payload` unchanged to InterAI's service-verification endpoint.

Current InterAI HMAC receipts are service-verifiable by InterAI. This tool does not claim independent offline public-key verification.

## Run the hub compatibility tests

No package install is required:

```bash
node toolkit/check-sources.mjs
node --test toolkit/*/*.test.mjs
```

Each satellite repository also has its own CI and standalone tests.

## Framework and protocol adapters

Use these tools directly, or start from the maintained integration examples:

- CrewAI: `examples/framework-integrations/crewai/`
- Mastra: `examples/framework-integrations/mastra/`
- OpenAI Agents SDK: `examples/framework-integrations/openai-agents/`
- Google ADK: `examples/framework-integrations/google-adk/`
- Agent Bounties mock adapter: `examples/protocol-integrations/agent-bounties/`

## Hub-and-satellites model

- `InterAILabs/ai-risk-oracle` remains the public product, contract, SDK and integration hub for Risk Oracle.
- the three standalone repositories above own their focused tool identity and release/contribution surface;
- standalone tools depend only on public code/contracts and never import the private core;
- the hosted decision engine remains behind `https://api.interailabs.dev`.

See `docs/public-toolkit-boundary.md` for the public/private publication boundary.
