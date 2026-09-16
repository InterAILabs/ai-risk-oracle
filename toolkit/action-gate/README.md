# Agent Action Gate

A tiny fail-closed execution wrapper for consequential agent actions.

Standalone repository identity: `InterAILabs/agent-action-gate`.

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

Execution requires the complete current InterAI authority contract: both `recommended_action` and `policy_result` must be present, valid, and equal to `allow`. Review/block decisions return without executing. Missing or contradictory authority fields, timeout, provider exceptions, malformed responses, unknown decisions, or action mutation throw `GateClosedError` and leave execution closed.

The decision provider receives a detached, deeply frozen snapshot plus a public action binding and `AbortSignal`. The wrapper re-checks the original action immediately before execution to catch mutation after the decision.

Action Gate composes with the open-source Exact Action Binding helper. That dependency is host-side integration code; neither tool contains Risk Oracle's private decision logic.

The example maps the generic host action into the public `interai-canonical-action/v1` request shape before calling `/verify`; the toolkit's local binding remains deliberately separate from the hosted canonical execution-intent protocol.

For framework-native interception, use the maintained adapters under `examples/framework-integrations/`.

## License

Apache-2.0. See `../LICENSE` and `../NOTICE` while this source lives in the Risk Oracle toolkit.
