import { Agent } from "@mastra/core/agent"
import { createTool } from "@mastra/core/tools"
import { z } from "zod"

const INTERAI_BASE_URL = process.env.INTERAI_BASE_URL || "https://ai-risk-oracle.fly.dev"
const INTERAI_API_KEY = process.env.INTERAI_API_KEY

if (!INTERAI_API_KEY) throw new Error("Set INTERAI_API_KEY")

async function verifyWithInterAI(input: {
  toolName: string
  args: Record<string, unknown>
}) {
  const amountUsd =
    typeof input.args.amountUsd === "number" ? input.args.amountUsd : undefined
  const idempotency = `mastra-${crypto.randomUUID()}`

  const response = await fetch(`${INTERAI_BASE_URL}/verify`, {
    method: "POST",
    headers: {
      authorization: `Bearer ${INTERAI_API_KEY}`,
      "content-type": "application/json",
      "x-idempotency-key": idempotency
    },
    body: JSON.stringify({
      use_case: "mastra-before-tool-execution",
      action: {
        type: input.toolName,
        name: input.toolName,
        description: `Mastra proposed tool call: ${input.toolName}`,
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

const releasePayment = createTool({
  id: "releaseVendorPayment",
  description: "Release a vendor payment after delivery validation.",
  inputSchema: z.object({
    amountUsd: z.number().positive(),
    vendorId: z.string()
  }),
  outputSchema: z.object({
    status: z.string(),
    vendorId: z.string().optional(),
    amountUsd: z.number().optional(),
    receiptId: z.string().optional()
  }),
  execute: async ({ amountUsd, vendorId }) => ({
    status: "simulated_only",
    vendorId,
    amountUsd
  })
})

export const paymentAgent = new Agent({
  id: "interai-payment-agent",
  name: "InterAI payment boundary demo",
  instructions:
    "Use releaseVendorPayment when needed. The execution harness checks every proposed tool call with InterAI before the tool can run.",
  model: "openai/gpt-5-mini",
  tools: { releasePayment },
  hooks: {
    beforeToolCall: async ({ toolName, input }) => {
      if (toolName !== "releasePayment") return

      const decision = await verifyWithInterAI({
        toolName,
        args: input as Record<string, unknown>
      })

      if (
        decision.recommended_action === "allow" &&
        decision.policy_result === "allow"
      ) {
        return
      }

      return {
        proceed: false,
        output: {
          status: `interai_${decision.recommended_action}`,
          receiptId: decision.trust_receipt_id
        }
      }
    }
  }
})

const result = await paymentAgent.generate(
  "Release a USD 250 payment to vendor_123 after delivery validation."
)

console.log(result.text)
