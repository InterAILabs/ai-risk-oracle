# Mastra + InterAI

This example uses Mastra's agent-level `beforeToolCall` hook to ask InterAI for an independent decision immediately before a tool executes.

```text
Mastra agent proposes tool
          |
          v
    beforeToolCall
          |
          v
       InterAI
          |
   ALLOW / REVIEW / BLOCK
          |
          v
proceed or return blocked output
```

Mastra added agent-level tool hooks in `@mastra/core@1.49.0`. A `beforeToolCall` hook can return `proceed: false` plus a tool-shaped output, which prevents the real tool from running.

That is a useful boundary for InterAI because the framework still owns orchestration while InterAI owns the independent pre-execution decision.

The sample payment tool is simulation-only and performs no real side effect.

## Requirements

- Node.js 20+
- `@mastra/core@1.49.0` or later
- `zod`
- provider credentials required by the model you select
- `INTERAI_API_KEY`

The example calls the hosted InterAI API directly so it does not depend on npm publication of the InterAI SDK.

## Alternative Mastra pattern

Mastra also supports tool approval (`requireApproval`) and explicitly allows a human or external system to approve or reject a tool call. That is useful when your application wants a suspended approval workflow. `beforeToolCall` is used here because it demonstrates the smallest synchronous InterAI boundary.