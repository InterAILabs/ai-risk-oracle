# OpenAI Agents SDK + InterAI

This example places InterAI at the function-tool boundary using an OpenAI Agents SDK **tool input guardrail**.

```text
agent proposes function tool
          |
          v
OpenAI tool input guardrail
          |
          v
       InterAI
          |
   ALLOW / REVIEW / BLOCK
          |
          v
for a real side effect: verify receipt + exact intent + authorization, then execute
```

OpenAI tool input guardrails run before a custom function tool executes and can reject the call without running the tool. That makes the hook a natural place to call an external pre-execution authority.

The sample tool is deliberately simulation-only: it returns what would have happened and performs no payment or other external side effect. It is not an executable-pilot authorization example. A real side-effecting tool must submit a host-built `interai-canonical-action/v1` plus host execution context, then immediately before dispatch verify the DecisionReceipt, recompute the exact final intent digest, validate the short-lived `ExecutionAuthorization`, and atomically consume it in durable host state where replay protection is required.

## Requirements

- Node.js 20+
- `@openai/agents`
- `zod` v4
- `OPENAI_API_KEY`
- `INTERAI_API_KEY`

The example calls the hosted InterAI API directly so it does not depend on npm publication of the InterAI SDK.

## Important boundary

The guardrail is effective only when the execution harness actually routes consequential function tools through it. Giving an agent an optional `verify` tool is not equivalent to enforcing a pre-execution boundary.
