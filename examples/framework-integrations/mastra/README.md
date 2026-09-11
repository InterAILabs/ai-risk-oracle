# Mastra + InterAI

This narrow reference integration treats InterAI as the independent pre-execution decision layer. Mastra owns orchestration, native approval suspension/resume, and execution.

```
tool proposal
  -> validated tool id + exact args
  -> InterAI decision + execution_intent_digest
  -> ALLOW ---------------------------> final exact-binding check -> execute
  -> REVIEW_REQUIRED -> Mastra approval suspension -> approve -> final check -> execute
                                                \-> decline -------------> no execution
  -> BLOCK ---------------------------------------------------------------> skipped
```

The evaluated action uses stable identity `interai.mastra.releaseVendorPayment` and includes both `vendor_id` and `amount_usd`. InterAI returns `execution_intent_digest`; the local helper separately canonicalizes the final tool identity and arguments, so a call binding cannot be consumed with changed arguments. An allow for `vendor-a`/$250 cannot authorize `vendor-b`/$250.

## Mastra seams

- `onInputAvailable` receives parsed `input` and `toolCallId`; it evaluates InterAI and binds the result to that Mastra call.
- Function-form `requireApproval` runs per parsed call and returns true only for `review_required`, invoking Mastra's native approval flow.
- `beforeToolCall` skips `block`. Its tool-shaped output is a model-facing denial required by Mastra, not an execution result.
- `execute` receives `context.agent.toolCallId`; immediately before the side effect it rebuilds the local canonical intent and consumes the call binding once. Mastra calls it for ALLOW, or after native approval resumes; decline does not call it.

The host drains `generate()` or `stream()` until pending approval, retains `runId` and `toolCallId`, then calls `approveToolCall({ runId, toolCallId })` or `declineToolCall({ runId, toolCallId })`. A DecisionReceipt records InterAI's decision; it is not a bearer token. An ExecutionReceipt is separate host/runtime evidence of dispatch or outcome.

## Scope and limits

Requires `@mastra/core` with tool hooks (1.49.0+) and an application-provided model/API key. This repository does not vend Mastra dependencies, so the focused tests cover the local binding helper; run the complete suspend/resume path in a Mastra application.

`beforeToolCall` and function-form `requireApproval` receive input but not `toolCallId`; `onInputAvailable` and `execute` do. The bridge fails closed when an args-only lookup is ambiguous rather than sharing authorization between identical calls. It is process-local demonstration state, not a distributed single-use ledger or cross-process concurrent replay prevention; production resume/retry guarantees require durable host state.

This covers only this agent-tool path. Provider-native/client-side execution, delegated agents, workflows, and background jobs need their own final reconstruction and enforcement at their side-effect boundary. HMAC-backed receipts are service-verifiable integrity evidence, not independent third-party attestation.

## Focused check

```bash
npx tsx --test examples/framework-integrations/mastra/intent-binding.test.ts
```
