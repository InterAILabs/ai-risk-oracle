import { createHash } from "node:crypto"

export type PaymentArgs = {
  amountUsd: number
  vendorId: string
}

export type InterAIDecision = {
  decision: "allow" | "review_required" | "block"
  executionIntentDigest?: string
  receiptId?: string
}

export type BoundDecision = InterAIDecision & {
  localIntentDigest: string
  toolCallId: string
}

function stableJson(value: unknown): string {
  if (value === null || typeof value !== "object") return JSON.stringify(value)
  if (Array.isArray(value)) return `[${value.map(stableJson).join(",")}]`
  const record = value as Record<string, unknown>
  return `{${Object.keys(record).sort().map((key) => `${JSON.stringify(key)}:${stableJson(record[key])}`).join(",")}}`
}

export function canonicalPaymentIntent(args: PaymentArgs) {
  return {
    tool: "interai.mastra.releaseVendorPayment",
    args: { amount_usd: args.amountUsd, vendor_id: args.vendorId },
    environment: "production",
  }
}

export function localIntentDigest(args: PaymentArgs): string {
  return createHash("sha256").update(stableJson(canonicalPaymentIntent(args))).digest("hex")
}

/** Process-local demonstration state, not a distributed replay ledger. */
export class DecisionBindings {
  #byToolCallId = new Map<string, BoundDecision>()

  remember(toolCallId: string, args: PaymentArgs, decision: InterAIDecision): BoundDecision {
    if (this.#byToolCallId.has(toolCallId)) throw new Error(`Refusing to replace decision for ${toolCallId}`)
    const bound = { ...decision, toolCallId, localIntentDigest: localIntentDigest(args) }
    this.#byToolCallId.set(toolCallId, bound)
    return bound
  }

  uniqueFor(args: PaymentArgs): BoundDecision | undefined {
    const matches = [...this.#byToolCallId.values()].filter((entry) => entry.localIntentDigest === localIntentDigest(args))
    // beforeToolCall / requireApproval lack toolCallId: ambiguity fails closed.
    return matches.length === 1 ? matches[0] : undefined
  }

  consumeForExecution(toolCallId: string, args: PaymentArgs): BoundDecision {
    const bound = this.#byToolCallId.get(toolCallId)
    if (!bound || bound.localIntentDigest !== localIntentDigest(args)) {
      throw new Error("No unconsumed InterAI decision is bound to this exact Mastra tool call and arguments")
    }
    if (bound.decision === "block") throw new Error("A BLOCK decision is non-authorizing")
    // Call only from Mastra execute: it occurs after ALLOW or native approval.
    this.#byToolCallId.delete(toolCallId)
    return bound
  }
}
