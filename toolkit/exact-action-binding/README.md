# Exact Action Binding

Deterministically bind a JSON-compatible action to a SHA-256 digest.

```js
import { createActionBinding, assertActionMatches } from "./index.mjs";

const action = {
  tool: "wallet.sign",
  args: { chainId: 8453, to: "0x...", amount: "10.00" },
};

const binding = createActionBinding(action);

// Immediately before the side effect:
assertActionMatches(binding, action);
```

Object keys are sorted recursively; array order is preserved. Undefined values, functions, symbols, BigInt, non-finite numbers, class instances, Dates, Maps and other non-plain JSON objects are rejected instead of being guessed or silently coerced.

This is a **public integration binding primitive**. It does not replace InterAI's hosted `CanonicalExecutionIntent`, `execution_intent_digest`, `ExecutionAuthorization`, policy identity, expiry, single-use semantics, or service-side receipt contract.
