# CrewAI + InterAI

This reference integration places InterAI at CrewAI's native `PRE_TOOL_CALL` boundary. InterAI decides whether the proposed consequential action is authorized; CrewAI remains responsible for orchestration and execution.

```text
tool call proposed
      |
      v
CrewAI PRE_TOOL_CALL
      |
      v
    InterAI
      |
      +-- ALLOW -> verify DecisionReceipt + ExecutionAuthorization
      |             + exact action/context binding
      |             + intent digest
      |             + TTL + single-use
      |             + receipt signature
      |             -> return normally -> CrewAI may execute
      |
      +-- REVIEW_REQUIRED ----------> HookAborted ----> no execution now
      +-- BLOCK --------------------> HookAborted ----> no execution
      +-- timeout / 5xx / bad JSON -> HookAborted ----> no execution
```

## Why the adapter catches every ordinary oracle failure

CrewAI intentionally treats ordinary hook exceptions as fail-open: exceptions other than `HookAborted` are swallowed so a buggy user hook does not break the framework. That is a reasonable generic framework default, but it is unsafe for an external authorization dependency if transport or validation errors are allowed to escape.

The InterAI adapter catches oracle, receipt, parsing, binding, and authorization failures inside the adapter and translates them into `HookAborted`. An outage or malformed response therefore cannot accidentally become permission to execute.

## ALLOW is necessary, but not sufficient

For the authenticated canonical-action contract used here, a plain `recommended_action == "allow"` is not the dispatch boundary. Before returning control to CrewAI, this example also:

- requires `request_contract == "autonomous_execution"`;
- requires a host-attested `execution_intent`;
- requires `execution_authorization` with `decision == "allow"` and `single_use == true`;
- checks the authorization `decision_id` and `execution_intent_digest` bindings;
- checks `issued_at` / `expires_at` and rejects expired authorization;
- verifies the exact canonical CrewAI action and host execution context;
- recomputes the execution-intent SHA-256 digest using the public recursive key-sorting JSON contract;
- fetches the DecisionReceipt and verifies its service-side HMAC signature;
- consumes the authorization once in the current process before returning normally.

Any digest or serialization mismatch fails closed. That keeps the authority boundary precise: InterAI supplies the decision and authorization evidence; the CrewAI host validates it; CrewAI remains the executor. A DecisionReceipt is decision evidence, not proof that execution happened. Execution outcome evidence remains separate.

## Exact action binding

The request uses `interai-canonical-action/v1` and binds the exact CrewAI `tool_name` plus `ctx.tool_input` as canonical `arguments`. It also supplies `interai-host-execution-context/v1`, including a required `INTERAI_WORKSPACE_ID` and the environment used for the execution boundary.

The current synchronous `PRE_TOOL_CALL` frame exposes the same mutable `ctx.tool_input` dictionary CrewAI will pass toward the tool. The adapter compares that final action with the host-attested intent returned by InterAI and refuses authorization if it differs. JSON numeric values are compared by numeric value rather than Python's broader truthy equality, so booleans cannot masquerade as numbers while `250` and `250.0` remain equivalent JSON numbers.

### Hook ordering is part of the boundary

CrewAI executes `PRE_TOOL_CALL` hooks in registration order. Register the InterAI gate **after any hook that is allowed to mutate `ctx.tool_input`**. If a later pre-tool hook can change the arguments after InterAI returns, the final action is no longer the one InterAI validated.

For deployments that cannot guarantee this ordering, put the final authorization validation in a host-owned executor wrapper immediately around the side effect instead of relying on a non-terminal hook position.

### Synchronous hook latency

CrewAI's current interception hooks are synchronous. This reference therefore uses a bounded synchronous HTTP call and fails closed on timeout. For latency-sensitive production paths, keep the decision service close to the executor (for example through a local gateway/sidecar) and use tight timeouts rather than turning oracle unavailability into implicit permission.

## REVIEW_REQUIRED

`review_required` does not authorize the current call. This example raises `HookAborted`, so the consequential tool does not execute now.

For delayed Slack/UI/human review, the original synchronous frame may be gone. Persist the proposal and decision evidence, then re-evaluate or validate the exact canonical intent before a later dispatch. If arguments or authoritative context change, request a new decision.

## Scope and replay protection

The checked-in registration is intentionally narrow: it protects the example `release_vendor_payment` tool through CrewAI's `tools=` filter. The example classifies that simulated capability as a reversible external side effect. Production integrations must classify each protected capability truthfully and include every equivalent consequential execution path.

CrewAI blocks one tool call and lets the agent run continue. An agent may retry or choose another tool, so all tools or paths capable of the same consequential effect must traverse an equivalent boundary.

The included single-use set protects this demonstration inside one Python process. Durable, atomic replay prevention across workers, restarts, or distributed runtimes remains the host's responsibility and should use persistent state keyed by decision/intent identity.

## Configuration

```bash
export INTERAI_API_KEY="..."
export INTERAI_WORKSPACE_ID="workspace_123"
export INTERAI_ENVIRONMENT="production"
```

Optional host identity fields:

```bash
export INTERAI_ACTOR_ID="agent_123"
export INTERAI_RUN_ID="run_456"
```

`INTERAI_OPERATION_ID` may be supplied as a stable business-operation idempotency key for retries of the same logical proposal. Do not reuse one operation ID across unrelated actions. If omitted, the reference adapter generates a fresh UUID-based key.

## Focused repro

Targeted at CrewAI `1.15.21`.

```bash
python -m pip install "crewai==1.15.21" requests pytest
cd examples/framework-integrations/crewai
pytest -q test_interai_hook.py
```

The focused tests cover 20 logical cases, including:

- a naive external-oracle `TimeoutError` demonstrating CrewAI's generic fail-open hook behavior;
- explicit validated ALLOW;
- BLOCK and REVIEW_REQUIRED;
- timeout, connection failure, HTTP 502-style errors, and malformed responses;
- invalid decision payloads;
- failure inside final ALLOW authorization validation;
- exact tool/argument binding and JSON numeric normalization;
- execution-intent digest, TTL, expiry, and process-local single-use checks;
- changed final arguments failing closed.

All side effects in this example are simulated.
