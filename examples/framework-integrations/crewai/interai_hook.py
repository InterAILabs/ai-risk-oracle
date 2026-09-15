from __future__ import annotations

import os
import uuid
from collections.abc import Callable, Mapping
from typing import Any, Literal

import requests
from crewai.hooks import HookAborted, InterceptionPoint, ToolCallHookContext, on

INTERAI_BASE_URL = os.environ.get("INTERAI_BASE_URL", "https://ai-risk-oracle.fly.dev")
Decision = Literal["allow", "review_required", "block"]
DecisionProvider = Callable[[str, dict[str, Any]], Mapping[str, Any]]
_VALID_DECISIONS: frozenset[str] = frozenset({"allow", "review_required", "block"})


class InvalidInterAIDecision(ValueError):
    """Raised when the oracle response cannot safely authorize execution."""


def _normalize_decision(payload: Mapping[str, Any]) -> Decision:
    recommended = payload.get("recommended_action")
    policy = payload.get("policy_result")

    if recommended not in _VALID_DECISIONS or policy not in _VALID_DECISIONS:
        raise InvalidInterAIDecision(
            "InterAI response must contain valid recommended_action and policy_result"
        )

    if recommended == "block" or policy == "block":
        return "block"
    if recommended == "review_required" or policy == "review_required":
        return "review_required"
    if recommended == "allow" and policy == "allow":
        return "allow"

    raise InvalidInterAIDecision("InterAI response did not produce a safe decision")


def verify_with_interai(tool_name: str, tool_input: dict[str, Any]) -> Mapping[str, Any]:
    """Evaluate the exact CrewAI tool proposal with InterAI."""
    api_key = os.environ.get("INTERAI_API_KEY")
    if not api_key:
        raise RuntimeError("INTERAI_API_KEY is required")

    action: dict[str, Any] = {
        "schema": "interai-canonical-action/v1",
        "tool_id": f"crewai.{tool_name}",
        "type": "tool_call",
        "operation": tool_name,
        "arguments": dict(tool_input),
        # Conservative defaults for this consequential-tool example. Production
        # adapters should classify each protected capability truthfully.
        "irreversible": True,
        "external_side_effect": True,
    }

    amount_usd = tool_input.get("amount_usd")
    if isinstance(amount_usd, (int, float)) and not isinstance(amount_usd, bool):
        action["amount_usd"] = amount_usd

    context: dict[str, Any] = {
        "environment": os.environ.get("INTERAI_ENVIRONMENT", "production"),
        "user_confirmation": False,
    }
    vendor_id = tool_input.get("vendor_id")
    if isinstance(vendor_id, str) and vendor_id:
        context["counterparty_id"] = vendor_id

    response = requests.post(
        f"{INTERAI_BASE_URL}/verify",
        headers={
            "Authorization": f"Bearer {api_key}",
            "Content-Type": "application/json",
            "X-Idempotency-Key": f"crewai-{uuid.uuid4()}",
        },
        json={
            "use_case": "crewai-before-tool-execution",
            "action": action,
            "authorization_ttl_seconds": 60,
            "context": context,
            "policy": {"require_trust_receipt": True},
        },
        timeout=10,
    )
    response.raise_for_status()
    payload = response.json()
    if not isinstance(payload, Mapping):
        raise InvalidInterAIDecision("InterAI response body must be a JSON object")
    return payload


def build_interai_gate(
    decision_provider: DecisionProvider = verify_with_interai,
) -> Callable[[ToolCallHookContext], None]:
    """Build a fail-closed PRE_TOOL_CALL gate.

    CrewAI intentionally swallows ordinary hook exceptions. Therefore every
    oracle transport, HTTP, parsing, and validation failure is translated into
    HookAborted here. The only normal return path is an explicit, valid ALLOW.
    """

    def gate(ctx: ToolCallHookContext) -> None:
        try:
            payload = decision_provider(ctx.tool_name, ctx.tool_input)
            decision = _normalize_decision(payload)
        except Exception as exc:
            raise HookAborted(
                reason="InterAI decision unavailable or invalid; execution denied",
                source="interai",
            ) from exc

        receipt_id = payload.get("trust_receipt_id")
        receipt_suffix = f" (receipt {receipt_id})" if isinstance(receipt_id, str) else ""

        if decision == "allow":
            return
        if decision == "review_required":
            raise HookAborted(
                reason=f"InterAI requires review before execution{receipt_suffix}",
                source="interai",
            )
        raise HookAborted(
            reason=f"InterAI blocked execution{receipt_suffix}",
            source="interai",
        )

    return gate


# Narrow reference registration. Add every consequential equivalent tool/path
# in production, or register a global gate with truthful per-tool action metadata.
interai_pre_tool_gate = build_interai_gate()
on(
    InterceptionPoint.PRE_TOOL_CALL,
    tools=["release_vendor_payment"],
)(interai_pre_tool_gate)
