import crypto from "node:crypto"
import { Agent } from "@mastra/core/agent"
import { createTool } from "@mastra/core/tools"
import { z } from "zod"
import { DecisionBindings, canonicalPaymentIntent, type PaymentArgs } from "./intent-binding.js"

const INTERAI_BASE_URL = process.env.INTERAI_BASE_URL ?? "https://ai-risk-oracle.fly.dev"
const INTERAI_API_KEY = process.env.INTERAI_API_KEY
if (!INTERAI_API_KEY) throw new Error("Set INTERAI_API_KEY before running this example")

const bindings = new DecisionBindings()
const paymentArgs = z.object({ amountUsd: z.number().positive(), vendorId: z.string().min(1) })

async function verifyWithInterAI(args: PaymentArgs) {
  const intent = canonicalPaymentIntent(args)
  const response = await fetch(`${INTERAI_BASE_URL}/verify`, {
    method: "POST",
    headers: { authorization: `Bearer ${INTERAI_API_KEY}`, "content-type": "application/json", "x-idempotency-key": `mastra-${crypto.randomUUID()}` },
    body: JSON.stringify({
      use_case: "mastra-release-vendor-payment",
      action: {
        type: intent.tool, name: "releaseVendorPayment",
        description: "Release a vendor payment from the production payment system.",
        amount_usd: intent.args.amount_usd, vendor_id: intent.args.vendor_id,
        irreversible: false, external_side_effect: true,
      },
      context: { agent_id: "mastra-payment-agent", environment: intent.environment, counterparty_id: intent.args.vendor_id, user_confirmation: false },
      policy: { require_trust_receipt: true },
    }),
  })
  if (!response.ok) throw new Error(`InterAI /verify failed: ${response.status}`)
  const body = await response.json() as {
    recommended_action: "allow" | "review_required" | "block"
    policy_result: "allow" | "review_required" | "block"
    execution_intent_digest?: string
    trust_receipt_id?: string
  }
  const decision = body.recommended_action === "block" || body.policy_result === "block"
    ? "block"
    : body.recommended_action === "review_required" || body.policy_result === "review_required"
      ? "review_required" : "allow"
  return { decision, executionIntentDigest: body.execution_intent_digest, receiptId: body.trust_receipt_id } as const
}

const releasePayment = createTool({
  id: "releaseVendorPayment",
  description: "Release a production payment after InterAI and Mastra approval.",
  inputSchema: paymentArgs,
  outputSchema: z.object({ status: z.string(), vendorId: z.string(), amountUsd: z.number(), receiptId: z.string().optional() }),
  // REVIEW_REQUIRED maps to Mastra's native approval suspension. ALLOW does not pause.
  requireApproval: async (args: PaymentArgs) => {
    const bound = bindings.uniqueFor(args)
    return !bound || bound.decision === "review_required"
  },
  // This is the earliest documented seam that provides both parsed input and toolCallId.
  onInputAvailable: async ({ toolCallId, input }) => {
    try { bindings.remember(toolCallId, input, await verifyWithInterAI(input)) }
    catch { bindings.remember(toolCallId, input, { decision: "block" }) }
  },
  execute: async (args: PaymentArgs, context) => {
    const toolCallId = context.agent?.toolCallId
    if (!toolCallId) throw new Error("This example requires a Mastra agent tool-call id")
    // Final enforcement immediately before the side effect; recomputes args and consumes once.
    const bound = bindings.consumeForExecution(toolCallId, args)
    return { status: "simulated_only", vendorId: args.vendorId, amountUsd: args.amountUsd, receiptId: bound.receiptId }
  },
})

export const paymentAgent = new Agent({
  id: "interai-mastra-payment-agent",
  name: "InterAI Mastra payment agent",
  instructions: "Use releaseVendorPayment only when a payment release is requested.",
  model: "openai/gpt-5.6-sol",
  tools: { releasePayment },
  hooks: {
    beforeToolCall: ({ toolName, input }) => {
      if (toolName !== "releasePayment") return
      const bound = bindings.uniqueFor(input as PaymentArgs)
      if (!bound || bound.decision === "block") {
        // Skips the tool; this required tool-shaped output is only a model-facing denial.
        return { proceed: false as const, output: { status: "interai_blocked", vendorId: input.vendorId, amountUsd: input.amountUsd } }
      }
    },
  },
})

// For REVIEW_REQUIRED, drain generate()/stream() until Mastra reports approval,
// then the host calls approveToolCall({ runId, toolCallId }) or declineToolCall(...).
await paymentAgent.generate("Release a $250 payment to vendor acme-corp.")
