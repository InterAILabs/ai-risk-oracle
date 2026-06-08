const baseUrl = "https://ai-risk-oracle.fly.dev"
const credential = "replace-with-your-credential"

const response = await fetch(`${baseUrl}/verify`, {
  method: "POST",
  headers: {
    authorization: `Bearer ${credential}`,
    "content-type": "application/json"
  },
  body: JSON.stringify({
    use_case: "agent-before-payment",
    action: {
      type: "payment",
      name: "release_vendor_payment",
      description: "Release vendor payment after delivery",
      amount_usd: 125,
      currency: "USD",
      irreversible: false,
      external_side_effect: true
    },
    context: {
      agent_id: "buyer_agent_001",
      environment: "production",
      counterparty_id: "vendor_agent_456",
      user_confirmation: false
    },
    policy: {
      max_risk_level: "medium",
      require_trust_receipt: true,
      amount_usd_limit: 500,
      blocked_action_types: ["irreversible_transfer"],
      require_human_review_above: 0.75
    }
  })
})

const decision = await response.json()

if (!response.ok) {
  throw new Error(`InterAI API error: HTTP ${response.status}`)
}

switch (decision.recommended_action) {
  case "allow":
    console.log("Gateway decision: allow. Continue with payment execution.", {
      decision_id: decision.decision_id,
      trust_receipt_id: decision.trust_receipt_id
    })
    break

  case "review_required":
    console.log(
      "Gateway decision: review_required. Pause this agent and route to a supervisor, policy system, wallet rule, governance queue, or human operator.",
      {
        decision_id: decision.decision_id,
        trust_receipt_id: decision.trust_receipt_id,
        policy_violations: decision.policy_violations
      }
    )
    break

  case "block":
    console.log("Gateway decision: block. Abort payment execution and log the decision.", {
      decision_id: decision.decision_id,
      trust_receipt_id: decision.trust_receipt_id,
      policy_violations: decision.policy_violations
    })
    break

  default:
    throw new Error(`Unknown gateway decision: ${decision.recommended_action}`)
}

export {}
