# Public Beta Plan

InterAI Risk Oracle is ready for a narrow technical beta when the goal is not
"prove truth", but help agents make safer `accept` / `review` / `reject`
decisions before costly actions.

## Beta Positioning

Use this promise:

```text
Paid trust-verification infrastructure for autonomous agents.
It issues auditable trust receipts before agents trust outputs, execute tools,
or settle payments.
```

Avoid these promises:

- guaranteed fact checking
- universal hallucination detection
- replacement for expert review
- fully autonomous safety in critical domains

## Best First Users

Prioritize builders who already have costly or risky agent workflows:

- agent developers gating tool execution
- AI workflow teams approving outputs before storage or delivery
- payment or marketplace experiments that need pre-settlement checks
- MCP/A2A integrators that need a machine-readable trust gate
- devtool teams that want receipts, idempotency, and billing traceability

Do not optimize first for casual chatbot users. The value is strongest when the
verification protects something more expensive than the verification itself.

## Beta Launch Gate

Before sending traffic to external builders:

- CI is green on `main`
- `npm run smoke:online` passes against production
- `npm run benchmark` has a published baseline and visible misses
- `/ready` is green in production
- `/pricing`, OpenAPI, Agent Card, discovery bundle, MCP, and A2A respond
- `/verify` without auth returns x402 `402`
- bearer-auth insufficient-balance behavior is documented
- admin stats are protected and do not expose API keys or secrets
- README and docs state current limits clearly

## Demo Flows To Lead With

Use demos that make the economic value obvious:

1. Agent before tool execution
   - Agent proposes a risky tool call.
   - Oracle returns `accept`, `review`, or `reject`.
   - The agent only executes on `accept`.
   - The run stores a receipt ID.

2. Agent before payment
   - Agent receives output from another agent/provider.
   - Oracle verifies the output with an idempotency key.
   - Payment is released only on acceptable trust result.
   - The public receipt is available for audit.

3. MCP discovery
   - MCP client initializes.
   - It lists oracle tools/resources/prompts.
   - It can inspect pricing and discovery without balance.
   - Paid verification requires bearer balance or x402.

4. A2A discovery
   - Agent Card declares capabilities and payment requirement.
   - A2A `message/send` returns payment-required when unauthenticated.
   - Authenticated calls return machine-readable trust receipts.

## Metrics To Watch

Operational:

- `/ready` failures
- error rates by endpoint
- x402 `402` responses vs settled payments
- bearer insufficient-balance responses
- top-up creation vs confirmation
- idempotency replays and conflicts

Adoption:

- landing views
- `/.well-known/agent.json` hits
- `/.well-known/discovery-bundle.json` hits
- `/pricing` hits
- MCP `initialize` and `tools/list`
- A2A `message/send`
- onboardings
- funded accounts
- verify calls
- repeat accounts

Trust quality:

- benchmark pass rate
- false positives and false negatives
- reject/review/accept distribution
- high-stakes domain usage
- user-reported calibration misses

## Next Product Bets

Only start these after CI, production smoke, and documentation stay stable:

- publish a GitHub release for the first beta tag
- publish or package the TypeScript SDK
- add a short public benchmark report with known limits
- add example videos or terminal recordings for the two main agent flows
- list the service where MCP, A2A, x402, and agent infrastructure builders look
- add optional deeper evidence-backed verification behind a separate mode
- add Postgres only when SQLite operational limits become a real constraint

## Default Outreach Message

```text
InterAI Risk Oracle is a paid trust-verification layer for AI agents.

It gives agents a machine-readable accept/review/reject decision plus an
auditable trust receipt before they execute tools, trust another agent's output,
or release payment.

It supports HTTP, x402 payment negotiation, MCP discovery/tools, A2A Agent Card,
prepaid Base USDC billing, idempotency, signed receipts, public receipt lookup,
and a published benchmark baseline with known limits.
```
