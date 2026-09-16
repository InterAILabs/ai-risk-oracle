# Action Gate

A tiny fail-closed execution wrapper for consequential agent actions.

```js
import { runActionGate } from "./index.mjs";

const result = await runActionGate({
  action: { tool: "email.send", args: { to: "ops@example.com" } },
  decide: async (action, { signal }) => {
    const response = await fetch("https://api.interailabs.dev/verify", {
      method: "POST",
      signal,
      headers: {
        authorization: `Bearer ${process.env.INTERAI_API_KEY}`,
        "content-type": "application/json",
      },
      body: JSON.stringify({
        use_case: "agent-before-tool-execution",
        action: {
          schema: "interai-canonical-action/v1",
          tool_id: action.tool,
          type: "tool_call",
          operation: "execute",
          arguments: action.args,
          external_side_effect: true,
          irreversible: false,
        },
        context: { environment: "production" },
      }),
    });
    if (!response.ok) throw new Error(`InterAI ${response.status}`);
    return response.json();
  },
  execute: async (exactAction) => {
    // Put the real side effect here.
    return sendEmail(exactAction.args);
  },
});
```

Only an unambiguous `allow` can call `execute`. Review/block decisions return without executing. Timeout, provider exceptions, malformed responses, unknown decisions, contradictory authority fields, or action mutation throw `GateClosedError` and leave execution closed.

The decision provider receives a detached, deeply frozen snapshot plus a public action binding and `AbortSignal`. The wrapper re-checks the original action immediately before execution to catch mutation after the decision.

The example maps the generic host action into the public `interai-canonical-action/v1` request shape before calling `/verify`; the toolkit's local binding remains deliberately separate from the hosted canonical execution-intent protocol.

For framework-native interception, use the maintained adapters under `examples/framework-integrations/`.
