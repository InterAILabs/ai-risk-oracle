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
execute tool only on ALLOW
```

OpenAI tool input guardrails run before a custom function tool executes and can reject the call without running the tool. That makes the hook a natural place to call an external pre-execution authority.

The sample tool is deliberately simulation-only: it returns what would have happened and performs no payment or other external side effect.

## Requirements

- Node.js 20+
- `@openai/agents`
- `zod` v4
- `OPENAI_API_KEY`
- `INTERAI_API_KEY`

The example calls the hosted InterAI API directly so it does not depend on npm publication of the InterAI SDK.

## Important boundary

The guardrail is effective only when the execution harness actually routes consequential function tools through it. Giving an agent an optional `verify` tool is not equivalent to enforcing a pre-execution boundary.