# InterAI Risk Oracle

**Independent pre-execution decision layer for consequential agent actions.**

> Before an agent executes, InterAI verifies.

I’m **Alejandro Bolognese**, building InterAI through **InterAI Labs** as ongoing work on agent infrastructure, execution control, trust boundaries, and production systems.

**Live proof:** [Action Boundary Lab](https://ai-risk-oracle.fly.dev/lab) · [Controlled safe demo](https://ai-risk-oracle.fly.dev/demo) · [Architecture & authority boundary](docs/architecture.md) · [OpenAPI](https://ai-risk-oracle.fly.dev/.well-known/openapi.json)

InterAI sits between an autonomous agent and a consequential action. The agent proposes what it wants to do; InterAI evaluates the action in context, applies authoritative host/account constraints plus any request-scoped caller constraints, and returns a machine-readable authority decision:

```text
proposed action
      |
      v
   InterAI
      |
      +--> ALLOW
      +--> REVIEW_REQUIRED
      +--> BLOCK
      |
      v
 signed trust receipt
```

The important boundary is not merely **can this principal technically perform the action?** It is:

**Should this specific action execute now, in this context, under this policy?**

That makes InterAI complementary to authentication, permissions, spend limits, workflow rules, and domain-specific controls rather than a replacement for them.

## Where InterAI Fits

```text
Identity / authentication
  "Who is this?"
        |
Permissions / deterministic limits
  "Can this principal do this class of operation?"
        |
InterAI
  "Should this exact proposed action execute in this context?"
        |
Execution / escalation / abort
```

Use InterAI when an agent is about to do something with real consequences: execute a tool, move funds, update production state, approve a workflow, sign a wallet action, send an external message, or trigger another irreversible or costly operation.

## Decision Contract

For autonomous execution requests, the primary InterAI authority contract is:

- `recommended_action`: `allow`, `review_required`, or `block`
- `policy_result`: the authority result under the effective policy
- `policy_violations`: explicit policy findings when applicable
- `trust_receipt_id`: durable decision evidence
- `execution_intent_digest`: deterministic identifier for the exact intent evaluated
- effective host/account/caller policy provenance in authenticated decision receipts

`review_required` means the current agent should not execute autonomously under the current policy. Review can be handled by a supervisor agent, policy system, governance queue, wallet rule, or human operator.

### Exact-action binding

For executable pilot authorization, the host constructs the trusted action envelope `interai-canonical-action/v1` and the host-attested execution context `interai-host-execution-context/v1`. InterAI returns a `CanonicalExecutionIntent` (`interai-canonical-execution-intent/v2`), `execution_intent_digest`, and—only for an authenticated `allow`—an `ExecutionAuthorization` (`interai-execution-authorization/v1`). The host must verify the receipt, rebuild the final invocation immediately before the side effect, recompute the canonical digest, validate the authorization, and fail closed on any mismatch. A change to tool, arguments, authoritative actor, run, workspace, environment, resource/destination, or relevant policy invalidates the earlier `allow` and requires a new decision. `review_required` and `block` are non-authorizing.

Execution authorization is single-use and short lived: 1–300 seconds, 60 seconds by default. InterAI does not provide universal distributed replay prevention across external runtimes; the host must atomically and durably consume the authorization when that guarantee is required.

If review changes the action, it is a new proposed intent. In Pydantic AI: `proposal → review/override → final validation → InterAI → exact-intent check → execute`; apply `ToolApproved.override_args` before final validation and InterAI.

The current hosted beta also returns `score`, `risk_level`, and machine-readable `signals`. Those fields remain part of the current compatibility surface and are useful for diagnostics and existing integrations, but they should not be interpreted as the fundamental authority contract. The execution boundary is the final `allow / review_required / block` decision under effective policy.

### Policy authority boundary

Hosted authenticated autonomous execution composes policy in strict authority order:

```text
HOST -> ACCOUNT -> CALLER -> EFFECTIVE
```

- **Host policy** is an InterAI-controlled irreducible floor.
- **Account policy** is a versioned profile stored outside the action request and attached only after the bearer credential resolves to its account.
- **Caller policy** can add request-scoped restrictions but cannot weaken host or account requirements.
- **Effective policy** is the stricter composition used for the decision.

Account policy administration is currently an **InterAI-administered control plane**. This is not yet customer self-service policy management, delegated tenant administration, or an enterprise policy-management product.

Accountless/x402 execution has no account profile to resolve and therefore remains `HOST -> CALLER -> EFFECTIVE`.

## External Evidence

InterAI can accept verifiable assertions produced by external systems without transferring execution authority to those systems.

**External evidence. Internal authority.**

> The provider asserts. InterAI decides authority.

The boundary is deliberate:

```text
external provider
      |
      | signed / verifiable assertion
      v
   InterAI
parse -> verify -> bind -> record
```

Current Stage 2 evidence is verified, bound, and recorded as non-authoritative external evidence. It does not change the InterAI execution decision or current compatibility risk signals.

The provider’s verdict remains an **assertion**, not an InterAI execution instruction. An upstream `PASS`, `CAUTION`, or `BLOCK` does not directly become `ALLOW`, `REVIEW_REQUIRED`, or `BLOCK` inside InterAI.

This separation matters because evidence and authority are different responsibilities. A specialized system may know something valuable about the world without becoming the system that decides whether an autonomous action is authorized to execute.

The current external-evidence boundary is intentionally narrow and non-authoritative. Live reference resolution or any future authority-bearing mode would be a separate trust-boundary decision, not an implicit extension of the current contract.

See [docs/external-evidence.md](docs/external-evidence.md) and [docs/architecture.md](docs/architecture.md).

### Insight ↔ InterAI

**Verified interoperability**

Insight and InterAI independently implemented and cross-verified interoperability against the frozen `external-evidence/v0` rev6 contract. The result demonstrates that a domain-specific provider can produce signed evidence that InterAI independently verifies, binds, and records as non-authoritative external evidence, while preserving the separation between provider assertion and InterAI execution authority.

This is an independently implemented technical interoperability result. It does not imply a production partnership or live production dependency between Insight and InterAI.

## Example

```json
{
  "use_case": "agent-before-payment",
  "action": {
    "type": "payment",
    "name": "release_vendor_payment",
    "description": "Release payment to a vendor agent after delivery validation",
    "amount_usd": 125,
    "currency": "USD",
    "irreversible": false,
    "external_side_effect": true
  },
  "context": {
    "agent_id": "agent_123",
    "environment": "production",
    "counterparty_id": "vendor_agent_456",
    "user_confirmation": false
  },
  "policy": {
    "require_trust_receipt": true,
    "amount_usd_limit": 500
  }
}
```

Possible authority result:

```json
{
  "request_contract": "autonomous_execution",
  "recommended_action": "allow",
  "policy_result": "allow",
  "execution_intent_digest": "sha256-hex-digest",
  "trust_receipt_id": "tr_01JZPUBLICEXAMPLE"
}
```

The hosted beta currently includes additional compatibility fields such as `score` and `risk_level`; they are omitted above to keep the execution-authority boundary clear.

The calling system then decides how to honor that authority decision:

```text
ALLOW             -> verify receipt + exact intent + authorization, then execute
REVIEW_REQUIRED   -> route / pause / escalate
BLOCK             -> abort
```

InterAI does not execute the action. The surrounding execution layer must route on the decision and enforce the final exact-intent comparison.

## Try The Hosted Beta

Action Boundary Lab — change the proposed action and inspect the real pre-execution decision boundary:

```text
https://ai-risk-oracle.fly.dev/lab
```

Controlled safe demo — one limited read-only sandbox verification with a real trust receipt:

```text
https://ai-risk-oracle.fly.dev/demo
```

Hosted verification:

```bash
curl -sS -X POST https://ai-risk-oracle.fly.dev/verify \
  -H "Authorization: Bearer <interai_credential>" \
  -H "Content-Type: application/json" \
  -H "X-Idempotency-Key: vendor-payment-001" \
  -d '{
    "use_case":"agent-before-payment",
    "action":{"type":"payment","name":"release_vendor_payment","amount_usd":125,"currency":"USD","irreversible":false,"external_side_effect":true},
    "context":{"environment":"production","counterparty_id":"vendor_agent_456","user_confirmation":false},
    "policy":{"require_trust_receipt":true,"amount_usd_limit":500}
  }'
```

## Trust Receipts

Every consequential decision can produce a durable trust receipt. Receipts are designed to make pre-execution decisions inspectable and transportable across retries, handoffs, governance systems, and later audits.

Authenticated autonomous DecisionReceipts bind policy provenance and `execution_intent_digest`. An ExecutionReceipt is separate host/runtime evidence about dispatch or outcome. A DecisionReceipt is evidence of a decision, not a bearer token or proof that a side effect occurred.

Current receipt signatures use HMAC-SHA256 and are **service-verifiable** by InterAI. That provides authenticated service-side integrity; it is not the same guarantee as an independently verifiable public-key signature that a third party can validate offline without InterAI.

A receipt proves what the signed receipt payload authenticates at that point in time. It does **not** prove that an underlying claim is universally true and does not replace domain-specific controls or human review where those are required.

See [docs/trust-receipts.md](docs/trust-receipts.md).

## Integration Surfaces

InterAI is available as a hosted service and can be discovered or called through several public interfaces:

- HTTPS API and OpenAPI 3.1
- published TypeScript SDK on npm: `interai-risk-oracle@0.1.3-beta`
- published Python SDK on PyPI: `interai-risk-oracle==0.1.3b0`
- MCP remote
- A2A endpoint
- `.well-known` discovery metadata
- x402 / Base USDC payment path
- prepaid API-key path

Install the published SDKs:

```bash
npm install interai-risk-oracle
pip install interai-risk-oracle==0.1.3b0
```

Useful starting points:

- [Architecture & authority boundary](docs/architecture.md)
- [External evidence boundary](docs/external-evidence.md)
- [Framework integration examples](examples/framework-integrations)
- [OpenAI Agents SDK example](examples/framework-integrations/openai-agents)
- [Mastra example](examples/framework-integrations/mastra)
- [Google ADK example](examples/framework-integrations/google-adk)
- [Integration patterns](docs/integration-patterns.md)
- [Tester readiness](docs/tester-readiness.md)
- [TypeScript SDK](sdk/typescript/README.md)
- [Python SDK](python/README.md)
- [TypeScript middleware example](examples/agent-middleware/typescript)
- [Python middleware example](examples/agent-middleware/python)
- [Agent before payment](examples/agent-before-payment)
- [Agent before tool execution](examples/agent-before-tool-execution)

## Current Product Scope

InterAI is a **controlled technical beta**.

Ready now:

- autonomous action verification
- explicit `allow / review_required / block` decisions
- enforced InterAI host policy floor
- versioned account-specific authoritative policy for authenticated accounts
- request-scoped caller policy that can only tighten higher-authority constraints
- non-authoritative external evidence ingestion with verification, binding, and recording
- signed, service-verifiable trust receipts with host/account/caller/effective policy provenance
- canonical execution-intent digest and exact-intent dispatch contract
- public receipt lookup
- idempotent paid verification, with account policy version/digest included in authenticated decision identity
- hosted OpenAPI, MCP, A2A, and machine-readable discovery
- published TypeScript and Python SDK packages

Not claimed yet:

- customer self-service or delegated tenant policy administration
- authority delegation to external evidence providers
- unrestricted live reference resolution for external evidence
- independently verifiable public-key receipt signatures
- distributed single-use execution or concurrent replay prevention across external runtimes
- broad high-volume production readiness
- enterprise procurement readiness
- universal factual truth guarantees
- replacement of medical, legal, financial, safety-critical, or other domain-specific review

See [docs/professional-readiness.md](docs/professional-readiness.md) for the current readiness boundary.

## Legacy Compatibility

InterAI still supports the earlier prompt/response verification contract for compatibility. The primary product direction is the `autonomous_execution` contract and pre-execution decision boundary.

The hosted beta also retains score/risk compatibility fields used by the current implementation and existing integrations. They are not the long-term conceptual definition of InterAI's authority boundary.

## Repository Boundary

This public repository contains integration materials: SDK sources, schemas, examples, OpenAPI/discovery metadata, and documentation for the hosted service.

The production verification engine, billing infrastructure, trust logic, scoring internals, and hosted service implementation remain proprietary.

## Engineering

I keep InterAI’s claims deliberately narrow. I’m not trying to brand every agent interaction as a security problem; I’m building a clear authority boundary before consequential execution.

I’m building InterAI as part of broader work on agent infrastructure, execution systems, trust boundaries, and production automation. I’m open to selected technical collaborations and infrastructure conversations where there is a concrete interoperability or execution-control problem to solve.

## Links

- Hosted beta: https://ai-risk-oracle.fly.dev
- Action Boundary Lab: https://ai-risk-oracle.fly.dev/lab
- Controlled safe demo: https://ai-risk-oracle.fly.dev/demo
- Pricing: https://ai-risk-oracle.fly.dev/pricing
- Onboard: https://ai-risk-oracle.fly.dev/onboard
- OpenAPI: https://ai-risk-oracle.fly.dev/.well-known/openapi.json
- MCP: https://ai-risk-oracle.fly.dev/mcp
- npm: https://www.npmjs.com/package/interai-risk-oracle
- PyPI: https://pypi.org/project/interai-risk-oracle/0.1.3b0/
- Support / security / collaborations: interailabs@gmail.com
