# OpenAI Agents SDK + InterAI

This example places InterAI at the OpenAI Agents SDK **function-tool execution boundary** and uses the published `interai-risk-oracle@0.1.7-beta` SDK.

```text
agent proposes function tool
          |
          v
OpenAI tool input guardrail
          |
          v
       InterAI
          |
ALLOW / REVIEW_REQUIRED / BLOCK
          |
   ALLOW only
          v
owner-authenticated DecisionReceipt
          |
rebuild exact final canonical action
          |
verify signature + intent digest + expiry
          |
atomically consume authorization
          |
          v
      side effect
```

OpenAI function-tool input guardrails run before the custom function tool executes and can reject a call without invoking the tool. That is the first pre-execution boundary. The example adds a second host-owned boundary inside `execute()` immediately before dispatch: it retrieves the complete owner-authenticated DecisionReceipt, rebuilds the canonical action from the validated arguments that are actually about to execute, validates the short-lived `ExecutionAuthorization`, and durably consumes the authorization once.

A mismatch, expired authorization, invalid receipt signature, replay, timeout, network failure, malformed response, `REVIEW_REQUIRED`, or `BLOCK` all fail closed. None of those conditions reaches the simulated provider call.

## Requirements

- Node.js 22.13+ (`node:sqlite` is used for the durable replay store)
- `@openai/agents@0.18.0`
- `interai-risk-oracle@0.1.7-beta`
- `zod@4.6.5`
- `OPENAI_API_KEY`
- `INTERAI_API_KEY`

Install and type-check the pinned example:

```bash
npm install
npm run typecheck
```

Run it:

```bash
node --experimental-strip-types example.ts
```

Set `INTERAI_BASE_URL` if you are not using the hosted service. `INTERAI_WORKSPACE_ID` controls the host-attested workspace identifier. `INTERAI_REPLAY_DB` controls the SQLite replay database path.

## Why there are two gates

The OpenAI tool input guardrail answers the policy question before the function tool is allowed to run. For an authorizing `ALLOW`, InterAI returns an execution authorization bound to the exact canonical intent. The tool then validates that authorization against the arguments that are actually about to reach the executor.

This separation protects against a dangerous class of drift where a decision was valid for one tool invocation but the arguments, destination, context, or authorization changed before the external side effect.

The sample uses `toolCall.callId` as the stable per-invocation correlation/idempotency identity and as the host `run_id`. InterAI verification errors are converted into a guardrail rejection rather than an implicit allow.

## Simulation boundary

`releaseVendorPaymentAtProvider()` is deliberately simulation-only. Replace that function with the real provider call only if the `validateAndConsumeReceipt()` call remains immediately before it and the arguments are not rewritten after validation.

The SQLite store provides durable single-host replay consumption. Multi-host deployments should implement `ExecutionAuthorizationReplayStore` on a shared database with an atomic unique insert/compare-and-set operation.

## OpenAI Agents scope

This pattern applies to custom function tools that participate in the SDK's tool-guardrail pipeline. Do not assume the same hook automatically covers handoffs, hosted tools, built-in shell/computer/apply-patch tools, or any executor that bypasses this function tool. Every consequential execution path must have an enforced pre-execution boundary.
