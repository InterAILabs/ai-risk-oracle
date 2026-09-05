# Framework integration examples

InterAI is not another agent framework. These examples show the smallest place to insert an independent pre-execution decision into three active agent ecosystems.

| Framework | Native hook | InterAI role |
|---|---|---|
| OpenAI Agents SDK | Tool input guardrail | Decide immediately before a custom function tool executes |
| Mastra | `beforeToolCall` | Allow or block a parsed tool call before execution |
| Google ADK | `before_tool_callback` | Return `None` to continue or a tool result to skip execution |

The invariant is the same in every framework:

```text
agent proposes consequential action
              |
              v
      framework execution hook
              |
              v
           InterAI
              |
    ALLOW / REVIEW_REQUIRED / BLOCK
              |
              v
  execute / route for review / abort
```

## Why the hook matters

An agent being *able to call* InterAI is not an enforcement boundary. The execution harness must place InterAI on the path that consequential actions actually traverse.

Authentication and permissions answer whether the principal can access a capability. InterAI answers whether this specific proposed action should execute now, in this context, under the applicable policy.

## Safety of these examples

Every sample side effect is simulated. The examples demonstrate placement and decision routing without sending money, modifying production, deleting data, or contacting external users.

## Package note

The examples call the hosted API directly. That keeps them truthful and runnable without claiming that the InterAI npm or PyPI package is publicly available until the corresponding registry publication is independently verified.