# Decision Receipt Helpers

Helpers for consuming InterAI's public receipt boundary without overstating what a receipt proves.

```js
import {
  assertReceiptIntentDigest,
  verifyReceiptWithService,
} from "./index.mjs";

assertReceiptIntentDigest(ownerLookup, expectedExecutionIntentDigest);
await verifyReceiptWithService({ lookup: ownerLookup });
```

Important rules enforced by the helper:

- an anonymous `public_summary` is a reference only and is never accepted as signed authorization evidence;
- the owner-authenticated lookup must contain complete service-verifiable evidence;
- `verification.signed_payload` is treated as opaque and forwarded unchanged;
- HTTP, transport, parse or invalid-signature outcomes fail closed;
- an expected `execution_intent_digest` must match exactly.

Current InterAI receipt signatures are HMAC-SHA256 and **service-verifiable by InterAI**. This module does not provide or claim independent offline public-key verification.
