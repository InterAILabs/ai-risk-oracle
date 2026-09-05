# Google ADK + InterAI

This example uses Google ADK's `before_tool_callback` as the pre-execution boundary.

```text
ADK agent proposes tool
          |
          v
  before_tool_callback
          |
          v
       InterAI
          |
   ALLOW / REVIEW / BLOCK
          |
          v
None = execute / dict = skip tool
```

ADK calls `before_tool_callback` after the tool and arguments are known and before the tool function runs. Returning `None` allows execution; returning a dictionary skips the normal tool execution and uses that dictionary as the tool result.

The sample payment function is simulation-only and performs no real side effect.

## Requirements

- Python supported by your current Google ADK release
- `google-adk`
- `requests`
- Gemini/provider credentials required by your ADK configuration
- `INTERAI_API_KEY`

The example calls the hosted InterAI API directly so it does not depend on PyPI publication of the InterAI SDK.

## Important boundary

For cross-agent policy, Google recommends reusable plugins when the same guardrail should apply broadly. This minimal example uses the agent-specific callback because it makes the execution boundary explicit and easy to inspect.