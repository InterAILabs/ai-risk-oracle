import os
import uuid
from typing import Any, Dict, Optional

import requests
from google.adk.agents import LlmAgent
from google.adk.tools import BaseTool, ToolContext

INTERAI_BASE_URL = os.environ.get("INTERAI_BASE_URL", "https://ai-risk-oracle.fly.dev")
INTERAI_API_KEY = os.environ["INTERAI_API_KEY"]


def verify_with_interai(tool_name: str, args: Dict[str, Any]) -> Dict[str, Any]:
    amount_usd = args.get("amount_usd")
    response = requests.post(
        f"{INTERAI_BASE_URL}/verify",
        headers={
            "Authorization": f"Bearer {INTERAI_API_KEY}",
            "Content-Type": "application/json",
            "X-Idempotency-Key": f"google-adk-{uuid.uuid4()}",
        },
        json={
            "use_case": "google-adk-before-tool-execution",
            "action": {
                "type": tool_name,
                "name": tool_name,
                "description": f"Google ADK proposed tool call: {tool_name}",
                **({"amount_usd": amount_usd} if isinstance(amount_usd, (int, float)) else {}),
                "irreversible": False,
                "external_side_effect": True,
            },
            "context": {
                "environment": "production",
                "user_confirmation": False,
            },
            "policy": {
                "require_trust_receipt": True,
            },
        },
        timeout=20,
    )
    response.raise_for_status()
    return response.json()


def interai_before_tool(
    tool: BaseTool,
    args: Dict[str, Any],
    tool_context: ToolContext,
) -> Optional[Dict[str, Any]]:
    decision = verify_with_interai(tool.name, args)

    if (
        decision.get("recommended_action") == "allow"
        and decision.get("policy_result") == "allow"
    ):
        return None

    return {
        "status": f"interai_{decision.get('recommended_action', 'block')}",
        "executed": False,
        "trust_receipt_id": decision.get("trust_receipt_id"),
    }


def release_vendor_payment(amount_usd: float, vendor_id: str) -> Dict[str, Any]:
    # Simulation only. Replace this body with your real side effect only after
    # the execution harness is guaranteed to route through the callback above.
    return {
        "status": "simulated_only",
        "vendor_id": vendor_id,
        "amount_usd": amount_usd,
    }


root_agent = LlmAgent(
    model="gemini-2.5-flash",
    name="interai_payment_boundary_demo",
    instruction=(
        "Use release_vendor_payment when needed. Every proposed tool call is "
        "checked by InterAI immediately before execution."
    ),
    tools=[release_vendor_payment],
    before_tool_callback=interai_before_tool,
)
