import {
  Agent,
  ToolGuardrailFunctionOutputFactory,
  defineToolInputGuardrail,
  run,
  tool
} from "@openai/agents"
import { z } from "zod"

const INTERAI_BASE_URL = process.env.INTERAI_BASE_URL || "https://ai-risk-oracle.fly.dev"
const INTERAI_API_KEY = process.env.INTERAI_API_KEY

if (!INTERAI_API_KEY) throw new Error("Set INTERAI_API_KEY")

async function verifyWithInterAI(input: {
  toolName: string
  toolCallId: string
  args: Record<string, unknown>
}) {
  const amountUsd =
    typeof input.args.amountUsd === "number" ? input.args.amountUsd : undefined

  const response = await fetch(`${INTERAI_BASE_URL}/verify`, {
    method: "POST",
    headers: {
      authorization: `Bearer ${INTERAI_API_KEY}`,
      "content-type": "application/json",
      "x-idempotency-key": `openai-agents-${input.toolCallId}`
    },
    body: JSON.stringify({
      use_case: "openai-agents-before-tool-execution",
      action: {
        type: input.toolName,
        name: input.toolName,
        description: `OpenAI Agents SDK proposed tool call: ${input.toolName}`,
        ...(amountUsd === undefined ? {} : { amount_usd: amountUsd }),
        irreversible: false,
        external_side_effect: true
      },
      context: {
        environment: "production",
        user_confirmation: false
      },
      policy: {
        require_trust_receipt: true
      }
    })
  })

  if (!response.ok) {
    throw new Error(`InterAI verification failed: ${response.status} ${await response.text()}`)
  }

  return response.json() as Promise<{
    recommended_action: "allow" | "review_required" | "block"
    policy_result: "allow" | "review_required" | "block"
    trust_receipt_id?: string
  }>
}

const interaiGuardrail = defineToolInputGuardrail({
  name: "interai_pre_execution_authority",
  run: async ({ toolCall }) => {
    const args = JSON.parse(toolCall.arguments) as Record<string, unknown>
    const decision = await verifyWithInterAI({
      toolName: toolCall.name,
      toolCallId: toolCall.callId,
      args
    })

    if (
      decision.recommended_action === "allow" &&
      decision.policy_result === "allow"
    ) {
      return ToolGuardrailFunctionOutputFactory.allow()
    }

    return ToolGuardrailFunctionOutputFactory.rejectContent(
      `InterAI ${decision.recommended_action}; tool execution skipped. Receipt: ${decision.trust_receipt_id ?? "unavailable"}`
    )
  }
})

const releasePayment = tool({
  name: "release_vendor_payment",
  description: "Release a vendor payment after delivery validation.",
  parameters: z.object({
    amountUsd: z.number().positive(),
    vendorId: z.string()
  }),
  inputGuardrails: [interaiGuardrail],
  execute: async ({ amountUsd, vendorId }) => ({
    status: "simulated_only",
    vendorId,
    amountUsd
  })
})

const agent = new Agent({
  name: "Payment operator",
  instructions:
    "Use the payment tool when needed. Tool execution is independently checked by InterAI before it can run.",
  tools: [releasePayment]
})

const result = await run(
  agent,
  "Release a USD 250 vendor payment to vendor_123 after delivery validation."
)

console.log(result.finalOutput)
