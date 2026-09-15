# Durable execution boundary

Requires Node 22.13+ and a build of `sdk/typescript` containing
`InterAIRiskOracleClient.validateAndConsumeReceipt`. This example is repository source;
an older published npm version may not contain the helper yet.

```js
import { SqliteReplayStore, dispatchWithInterAI } from './durable-dispatch.mjs'
const replayStore = new SqliteReplayStore('/private/runtime/interai-replay.db')
try {
  await dispatchWithInterAI({
    client, // configured with the owning account API key
    receiptId: decision.trust_receipt_id,
    buildFinalIntent: rebuildFinalIntentAtHostBoundary,
    replayStore,
    execute: args => hostOwnedTool(args)
  })
} finally {
  replayStore.close()
}
```

The client authenticates the complete receipt including its structured fields,
extracts the signed authorization, checks the exact final intent and expiry,
and consumes `decision_id:execution_intent_digest` in persistent storage.
Concurrent workers sharing the SQLite file cannot consume a key twice; restart
does not clear the record. Database errors stop execution. Never delete consumed
keys while authorizations can remain valid. Separate hosts require one shared,
atomic store instead of separate SQLite files.

The executor receives the frozen argument snapshot that was checked. The host
must enforce identity, tool mapping and terminal hook ordering. No downstream
side effect is guaranteed exactly once: a crash after consumption may leave the
outcome unknown. Reconcile with the downstream system; do not automatically
clear the replay key or request a fresh grant to retry an uncertain operation.

Public receipt links contain only ID and issuance time. The complete receipt
and opaque signed payload require the owning account's active Bearer key.
For accountless x402 operations, preserve the complete receipt returned by
verification; the public lookup cannot recover its private contents.
