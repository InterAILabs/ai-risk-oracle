import { DatabaseSync } from "node:sqlite"

import {
  Agent,
  ToolGuardrailFunctionOutputFactory,
  defineToolInputGuardrail,
  run,
  tool
} from "@openai/agents"
import {
  CANONICAL_ACTION_SCHEMA,
  HOST_EXECUTION_CONTEXT_SCHEMA,
  InterAIRiskOracleClient,
  type CanonicalActionEnvelope,
  type CanonicalExecutionIntent,
  type ExecutionAuthorizationReplayStore,
  type VerifyResponse
} from "interai-risk-oracle"
import { z } from "zod"

const INTERAI_BASE_URL = process.env.INTERAI_BASE_URL || "https://ai-risk-oracle.fly.dev"
const INTERAI_API_KEY = process.env.INTERAI_API_KEY
const WORKSPACE_ID = process.env.INTERAI_WORKSPACE_ID || "openai-agents-example"
const REPLAY_DB = process.env.INTERAI_REPLAY_DB || "./interai-openai-agents-replay.sqlite"

if (!INTERAI_API_KEY) throw new Error("Set INTERAI_API_KEY")

const interai = new InterAIRiskOracleClient({
  baseUrl: INTERAI_BASE_URL,
  apiKey: INTERAI_API_KEY,
  clientName: "openai-agents-example/0.1.4",
  timeoutMs: 5_000
})

class SqliteReplayStore implements ExecutionAuthorizationReplayStore {
  private readonly db: DatabaseSync

  constructor(filename: string) {
    this.db = new DatabaseSync(filename)
    this.db.exec(
      "PRAGMA busy_timeout=5000; CREATE TABLE IF NOT EXISTS consumed_authorizations (replay_key TEXT PRIMARY KEY)"
    )
  }

  consumeOnce(key: string): boolean {
    const result = this.db
      .prepare("INSERT INTO consumed_authorizations(replay_key) VALUES (?) ON CONFLICT(replay_key) DO NOTHING")
      .run(key)
    return Number(result.changes) === 1
  }

  close() {
    this.db.close()
  }
}

const replayStore = new SqliteReplayStore(REPLAY_DB)

type PaymentArgs = {
  amountUsd: number
  vendorId: string
}

type PendingDecision = {
  decision: VerifyResponse
}

const pendingByToolCall = new Map<string, PendingDecision>()

function canonicalPaymentAction(args: PaymentArgs): CanonicalActionEnvelope {
  return {
    schema: CANONICAL_ACTION_SCHEMA,
    tool_id: "release_vendor_payment",
    type: "payment",
    operation: "release_vendor_payment",
    arguments: {
      amountUsd: args.amountUsd,
      vendorId: args.vendorId
    },
    destination: args.vendorId,
    external_side_effect: true,
    irreversible: true
  }
}

function finalIntentFromDecision(
  decision: VerifyResponse,
  finalAction: CanonicalActionEnvelope
): CanonicalExecutionIntent {
  if (!decision.execution_intent) {
    throw new Error("InterAI ALLOW did not include execution_intent")
  }

  return {
    ...structuredClone(decision.execution_intent),
    // Rebuild the action from the validated arguments that are actually about to execute.
    // If they differ from what InterAI authorized, validateAndConsumeReceipt fails closed.
    canonical_action: structuredClone(finalAction)
  }
}

const interaiGuardrail = defineToolInputGuardrail({
  name: "interai_pre_execution_authority",
  run: async ({ toolCall }) => {
    pendingByToolCall.delete(toolCall.callId)

    try {
      const args = JSON.parse(toolCall.arguments) as PaymentArgs
      const action = canonicalPaymentAction(args)
      const decision = await interai.verify(
        {
          use_case: "openai-agents-before-tool-execution",
          action,
          execution_context: {
            schema: HOST_EXECUTION_CONTEXT_SCHEMA,
            workspace_id: WORKSPACE_ID,
            environment: "production",
            actor_id: "openai-agents-sdk",
            run_id: toolCall.callId
          },
          context: {
            environment: "production",
            user_confirmation: true
          },
          policy: {
            require_trust_receipt: true
          },
          authorization_ttl_seconds: 60
        },
        `openai-agents-${toolCall.callId}`,
        { timeoutMs: 5_000 }
      )

      const authorizing =
        decision.recommended_action === "allow" &&
        decision.policy_result === "allow" &&
        Boolean(decision.trust_receipt_id) &&
        Boolean(decision.execution_intent) &&
        Boolean(decision.execution_authorization)

      if (!authorizing) {
        return ToolGuardrailFunctionOutputFactory.rejectContent(
          `InterAI ${decision.recommended_action}; tool execution skipped. Receipt: ${decision.trust_receipt_id ?? "unavailable"}`
        )
      }

      pendingByToolCall.set(toolCall.callId, { decision })
      return ToolGuardrailFunctionOutputFactory.allow()
    } catch (error) {
      // Network errors, timeouts, malformed responses, and parsing failures all block execution.
      const message = error instanceof Error ? error.message : "unknown InterAI failure"
      return ToolGuardrailFunctionOutputFactory.rejectContent(
        `InterAI unavailable or invalid; fail closed. Tool execution skipped. ${message}`
      )
    }
  }
})

async function releaseVendorPaymentAtProvider(args: PaymentArgs) {
  // Replace this simulation with the real provider call only after preserving the
  // exact same validate-and-consume boundary immediately above it.
  return {
    status: "simulated_only",
    vendorId: args.vendorId,
    amountUsd: args.amountUsd
  }
}

const releasePayment = tool({
  name: "release_vendor_payment",
  description: "Release a vendor payment after delivery validation.",
  parameters: z.object({
    amountUsd: z.number().positive(),
    vendorId: z.string().min(1)
  }),
  inputGuardrails: [interaiGuardrail],
  execute: async (args, _context, details) => {
    const callId = details?.toolCall?.callId
    if (!callId) throw new Error("Missing OpenAI Agents tool call ID; refusing execution")

    const pending = pendingByToolCall.get(callId)
    pendingByToolCall.delete(callId)
    if (!pending) throw new Error("Missing InterAI authorization; refusing execution")

    const receiptId = pending.decision.trust_receipt_id
    if (!receiptId) throw new Error("Missing InterAI receipt; refusing execution")

    const finalAction = canonicalPaymentAction(args)
    const finalIntent = finalIntentFromDecision(pending.decision, finalAction)
    const lookup = await interai.getTrustReceipt(receiptId)
    const gate = await interai.validateAndConsumeReceipt({
      lookup,
      finalIntent,
      replayStore
    })

    if (!gate.ok) {
      throw new Error(`InterAI dispatch denied: ${gate.code}`)
    }

    // Nothing may rewrite args between this gate and the provider call.
    return releaseVendorPaymentAtProvider(args)
  }
})

const agent = new Agent({
  name: "Payment operator",
  instructions:
    "Use the payment tool only when the user explicitly requests the payment. InterAI independently authorizes each exact invocation immediately before execution.",
  tools: [releasePayment]
})

try {
  const result = await run(
    agent,
    "Release a USD 250 vendor payment to vendor_123 after delivery validation."
  )
  console.log(result.finalOutput)
} finally {
  replayStore.close()
}
