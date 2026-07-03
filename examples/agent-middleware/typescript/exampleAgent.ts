import {
  AgentAction,
  executeWithInterAIGate
} from "./interaiMiddleware.js"

const safeLookupAction: AgentAction = {
  type: "read_only_lookup",
  name: "check_order_status",
  description: "Read a demo order status in a sandbox",
  external_side_effect: false,
  irreversible: false
}

async function fakeSandboxExecutor(action: AgentAction) {
  return {
    executed: true,
    action_name: action.name,
    sandbox_result: "order_status: ready_for_review"
  }
}

async function main() {
  const result = await executeWithInterAIGate(
    safeLookupAction,
    fakeSandboxExecutor,
    {
      agentId: "example_agent_typescript",
      environment: "sandbox"
    }
  )

  if (result.status === "executed") {
    console.log("Tool executed in sandbox", result.result)
  } else if (result.status === "review_required") {
    console.log("Route to supervisor", {
      reason: result.review_reason,
      trust_receipt_id: result.trust_receipt_id
    })
  } else {
    console.log("Action blocked", {
      reason: result.block_reason,
      trust_receipt_id: result.trust_receipt_id
    })
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error)
  process.exitCode = 1
})
