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
      +-- ALLOW --------------------> return normally -> CrewAI may execute
      +-- REVIEW_REQUIRED ----------> HookAborted ----> no execution now
      +-- BLOCK --------------------> HookAborted ----> no execution
      +-- timeout / 5xx / bad JSON -> HookAborted ----> no execution
```

## Why the adapter catches every ordinary oracle failure

CrewAI intentionally treats ordinary hook exceptions as fail-open: exceptions other than `HookAborted` are swallowed so a buggy user hook does not break the framework. That is a reasonable generic framework default, but it is unsafe for an external authorization dependency if transport or validation errors are allowed to escape.

The InterAI adapter therefore has one execution-authorizing path only: a valid response where both `recommended_action` and `policy_result` resolve to `allow`. `block`, `review_required`, conflicting decisions, missing fields, unknown enum values, timeouts, connection failures, HTTP errors, malformed JSON, and other ordinary provider failures are converted into `HookAborted` before the tool runs.

This preserves the authority boundary:

- InterAI returns `allow`, `review_required`, or `block`.
- The CrewAI hook enforces that decision at the pre-tool seam.
- CrewAI remains the executor.
- A DecisionReceipt is decision evidence, not proof that the tool executed.

## Exact action binding

The request uses `interai-canonical-action/v1` and sends the exact CrewAI `tool_name` plus `ctx.tool_input` as canonical `arguments`. In the synchronous `PRE_TOOL_CALL` path, `ctx.tool_input` is the same mutable input dictionary CrewAI passes to the tool, so there is no separate approval/execution re-binding step inside that frame.

For delayed Slack/UI/human review, the original frame is gone. Treat `review_required` as **no authorization to execute now**. Persist the proposal and decision evidence, then re-evaluate or validate the exact canonical intent before any later dispatch. Changed arguments require a new decision.

## Scope

`interai_hook.py` registers the gate on CrewAI's `PRE_TOOL_CALL` point. The included request marks the proposed operation as an external side effect and non-irreversible as a narrow reference shape; production integrations must provide truthful action metadata for each protected capability and ensure every equivalent consequential execution path is covered.

CrewAI blocks a single tool call and lets the agent run continue. An agent may retry or choose another tool. Coverage is therefore a host responsibility: all tools or execution paths capable of the consequential effect must traverse an InterAI gate.

## Focused repro

Targeted at CrewAI `1.15.21`.

```bash
python -m pip install "crewai==1.15.21" requests pytest
cd examples/framework-integrations/crewai
pytest -q test_interai_hook.py
```

The tests demonstrate both sides of the boundary:

- a naive external-oracle hook that raises `TimeoutError` is fail-open under CrewAI's generic hook dispatcher;
- the InterAI gate converts provider failures into `HookAborted` and fails closed;
- explicit valid `ALLOW` proceeds;
- `BLOCK` and `REVIEW_REQUIRED` do not execute;
- timeout, connection failure, HTTP 502-style errors, malformed JSON, and invalid decision payloads do not execute.

All side effects in this example are simulated.
