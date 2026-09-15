from __future__ import annotations

import hashlib
import json
import os
import threading
import uuid
from collections.abc import Callable, Mapping
from copy import deepcopy
from datetime import datetime, timezone
from typing import Any, Literal
from urllib.parse import quote

import requests
from crewai.hooks import HookAborted, InterceptionPoint, ToolCallHookContext, on

INTERAI_BASE_URL = os.environ.get("INTERAI_BASE_URL", "https://ai-risk-oracle.fly.dev")
Decision = Literal["allow", "review_required", "block"]
DecisionProvider = Callable[[dict[str, Any]], Mapping[str, Any]]
AllowValidator = Callable[[Mapping[str, Any], dict[str, Any]], None]
_VALID_DECISIONS: frozenset[str] = frozenset({"allow", "review_required", "block"})
_consumed_authorizations: set[str] = set()
_consumption_lock = threading.Lock()


class InvalidInterAIDecision(ValueError):
    """Raised when a response cannot safely authorize execution."""


def _normalize_json(value: Any) -> Any:
    if isinstance(value, list):
        return [_normalize_json(item) for item in value]
    if isinstance(value, dict):
        return {key: _normalize_json(value[key]) for key in sorted(value)}
    return value


def _execution_intent_digest(intent: Mapping[str, Any]) -> str:
    canonical = json.dumps(
        _normalize_json(dict(intent)),
        ensure_ascii=False,
        separators=(",", ":"),
        allow_nan=False,
    ).encode("utf-8")
    return hashlib.sha256(canonical).hexdigest()


def _parse_datetime(value: Any, field: str) -> datetime:
    if not isinstance(value, str) or not value:
        raise InvalidInterAIDecision(f"Missing {field}")
    normalized = value[:-1] + "+00:00" if value.endswith("Z") else value
    try:
        parsed = datetime.fromisoformat(normalized)
    except ValueError as exc:
        raise InvalidInterAIDecision(f"Invalid {field}") from exc
    if parsed.tzinfo is None:
        raise InvalidInterAIDecision(f"{field} must be timezone-aware")
    return parsed.astimezone(timezone.utc)


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


def _build_verify_request(ctx: ToolCallHookContext) -> dict[str, Any]:
    workspace_id = os.environ.get("INTERAI_WORKSPACE_ID")
    if not workspace_id:
        raise RuntimeError("INTERAI_WORKSPACE_ID is required for executable authorization")

    environment = os.environ.get("INTERAI_ENVIRONMENT", "production")
    action: dict[str, Any] = {
        "schema": "interai-canonical-action/v1",
        "tool_id": f"crewai.{ctx.tool_name}",
        "type": "tool_call",
        "operation": ctx.tool_name,
        "arguments": dict(ctx.tool_input),
        "irreversible": False,
        "external_side_effect": True,
    }

    amount_usd = ctx.tool_input.get("amount_usd")
    if isinstance(amount_usd, (int, float)) and not isinstance(amount_usd, bool):
        action["amount_usd"] = amount_usd

    execution_context: dict[str, Any] = {
        "schema": "interai-host-execution-context/v1",
        "workspace_id": workspace_id,
        "environment": environment,
    }
    actor_id = os.environ.get("INTERAI_ACTOR_ID") or getattr(ctx.agent, "role", None)
    if isinstance(actor_id, str) and actor_id:
        execution_context["actor_id"] = actor_id
    run_id = os.environ.get("INTERAI_RUN_ID")
    if run_id:
        execution_context["run_id"] = run_id

    context: dict[str, Any] = {
        "environment": environment,
        "user_confirmation": False,
    }
    if isinstance(actor_id, str) and actor_id:
        context["agent_id"] = actor_id
    vendor_id = ctx.tool_input.get("vendor_id")
    if isinstance(vendor_id, str) and vendor_id:
        context["counterparty_id"] = vendor_id

    return {
        "use_case": "crewai-before-tool-execution",
        "action": action,
        "execution_context": execution_context,
        "authorization_ttl_seconds": 60,
        "context": context,
        "policy": {"require_trust_receipt": True},
    }


def _auth_headers() -> dict[str, str]:
    api_key = os.environ.get("INTERAI_API_KEY")
    if not api_key:
        raise RuntimeError("INTERAI_API_KEY is required")
    return {"Authorization": f"Bearer {api_key}"}


def verify_with_interai(request_body: dict[str, Any]) -> Mapping[str, Any]:
    """Evaluate the exact host-attested CrewAI tool proposal with InterAI."""
    operation_id = os.environ.get("INTERAI_OPERATION_ID") or f"crewai-{uuid.uuid4()}"
    response = requests.post(
        f"{INTERAI_BASE_URL}/verify",
        headers={
            **_auth_headers(),
            "Content-Type": "application/json",
            "X-Idempotency-Key": operation_id,
        },
        json=request_body,
        timeout=10,
    )
    response.raise_for_status()
    payload = response.json()
    if not isinstance(payload, Mapping):
        raise InvalidInterAIDecision("InterAI response body must be a JSON object")
    return payload


def _verify_receipt_signature(
    receipt_id: str,
    decision_id: str,
    execution_intent_digest: str,
) -> None:
    lookup_response = requests.get(
        f"{INTERAI_BASE_URL}/trust/receipts/{quote(receipt_id, safe='')}",
        headers=_auth_headers(),
        timeout=10,
    )
    lookup_response.raise_for_status()
    lookup = lookup_response.json()
    if not isinstance(lookup, Mapping):
        raise InvalidInterAIDecision("Trust receipt lookup must be a JSON object")

    receipt = lookup.get("receipt")
    verification = lookup.get("verification")
    if not isinstance(receipt, Mapping) or not isinstance(verification, Mapping):
        raise InvalidInterAIDecision("Trust receipt lookup is incomplete")
    if receipt.get("receipt_id") != receipt_id:
        raise InvalidInterAIDecision("Trust receipt id mismatch")
    if receipt.get("decision_id") != decision_id:
        raise InvalidInterAIDecision("Trust receipt decision id mismatch")
    if receipt.get("execution_intent_digest") != execution_intent_digest:
        raise InvalidInterAIDecision("Trust receipt execution intent mismatch")

    signature = verification.get("signature")
    signed_payload = verification.get("signed_payload")
    signature_alg = verification.get("signature_alg")
    signed_values = (signature, signed_payload, signature_alg)
    if not all(isinstance(value, str) and value for value in signed_values):
        raise InvalidInterAIDecision("Trust receipt is not signed")
    if signature_alg != "hmac-sha256":
        raise InvalidInterAIDecision("Unexpected trust receipt signature algorithm")
    if receipt.get("recommended_action") not in (None, "allow"):
        raise InvalidInterAIDecision("Trust receipt does not record an allow decision")

    check_response = requests.post(
        f"{INTERAI_BASE_URL}/trust/verify-signature",
        headers={**_auth_headers(), "Content-Type": "application/json"},
        json={
            "receipt_id": receipt_id,
            "signed_payload": signed_payload,
            "signature": signature,
            "signature_alg": signature_alg,
        },
        timeout=10,
    )
    check_response.raise_for_status()
    check = check_response.json()
    if not isinstance(check, Mapping) or check.get("valid") is not True:
        raise InvalidInterAIDecision("Trust receipt signature is invalid")


def validate_allow_for_dispatch(
    payload: Mapping[str, Any],
    request_body: dict[str, Any],
) -> None:
    """Validate an authenticated ALLOW immediately before CrewAI dispatch."""
    if payload.get("request_contract") != "autonomous_execution":
        raise InvalidInterAIDecision("Unexpected InterAI request contract")

    decision_id = payload.get("decision_id")
    receipt_id = payload.get("trust_receipt_id")
    response_digest = payload.get("execution_intent_digest")
    intent = payload.get("execution_intent")
    authorization = payload.get("execution_authorization")

    bound_ids = (decision_id, receipt_id, response_digest)
    if not all(isinstance(value, str) and value for value in bound_ids):
        raise InvalidInterAIDecision("ALLOW is missing decision or receipt binding")
    if not isinstance(intent, Mapping) or not isinstance(authorization, Mapping):
        raise InvalidInterAIDecision("ALLOW is missing execution intent or authorization")
    if intent.get("schema") != "interai-canonical-execution-intent/v2":
        raise InvalidInterAIDecision("Unexpected execution intent schema")
    if intent.get("action_authority") != "host_attested_canonical":
        raise InvalidInterAIDecision("Execution intent is not host-attested canonical")
    if intent.get("canonical_action") != request_body["action"]:
        raise InvalidInterAIDecision("Final CrewAI action differs from the evaluated action")

    authoritative_context = intent.get("authoritative_context")
    if not isinstance(authoritative_context, Mapping):
        raise InvalidInterAIDecision("Execution intent lacks authoritative context")
    for key, value in request_body["execution_context"].items():
        if authoritative_context.get(key) != value:
            raise InvalidInterAIDecision(f"Execution context mismatch for {key}")

    if authorization.get("schema") != "interai-execution-authorization/v1":
        raise InvalidInterAIDecision("Unexpected execution authorization schema")
    if authorization.get("decision") != "allow" or authorization.get("single_use") is not True:
        raise InvalidInterAIDecision(
            "Execution authorization is not an authorizing single-use grant"
        )
    if authorization.get("decision_id") != decision_id:
        raise InvalidInterAIDecision("Execution authorization decision id mismatch")
    if authorization.get("execution_intent_digest") != response_digest:
        raise InvalidInterAIDecision("Execution authorization digest mismatch")

    expires_at = _parse_datetime(authorization.get("expires_at"), "expires_at")
    issued_at = _parse_datetime(authorization.get("issued_at"), "issued_at")
    now = datetime.now(timezone.utc)
    if expires_at <= now or expires_at <= issued_at:
        raise InvalidInterAIDecision("Execution authorization is expired or invalid")

    final_intent = deepcopy(dict(intent))
    final_intent["canonical_action"] = deepcopy(request_body["action"])
    computed_digest = _execution_intent_digest(final_intent)
    if computed_digest != response_digest:
        raise InvalidInterAIDecision("Final execution intent digest does not match authorization")

    _verify_receipt_signature(receipt_id, decision_id, computed_digest)

    authorization_key = f"{decision_id}:{computed_digest}"
    with _consumption_lock:
        if authorization_key in _consumed_authorizations:
            raise InvalidInterAIDecision(
                "Execution authorization was already consumed in this process"
            )
        _consumed_authorizations.add(authorization_key)


def build_interai_gate(
    decision_provider: DecisionProvider = verify_with_interai,
    allow_validator: AllowValidator = validate_allow_for_dispatch,
) -> Callable[[ToolCallHookContext], None]:
    """Build a fail-closed PRE_TOOL_CALL gate.

    CrewAI intentionally swallows ordinary hook exceptions. Every oracle,
    receipt, parsing, binding, and validation failure is therefore translated
    into HookAborted here. The only normal return path is a validated,
    single-use authenticated ALLOW bound to the final tool input.
    """

    def gate(ctx: ToolCallHookContext) -> None:
        try:
            request_body = _build_verify_request(ctx)
            payload = decision_provider(request_body)
            decision = _normalize_decision(payload)

            receipt_id = payload.get("trust_receipt_id")
            receipt_suffix = (
                f" (receipt {receipt_id})" if isinstance(receipt_id, str) else ""
            )

            if decision == "review_required":
                raise HookAborted(
                    reason=f"InterAI requires review before execution{receipt_suffix}",
                    source="interai",
                )
            if decision == "block":
                raise HookAborted(
                    reason=f"InterAI blocked execution{receipt_suffix}",
                    source="interai",
                )

            allow_validator(payload, request_body)
            return
        except HookAborted:
            raise
        except Exception as exc:
            raise HookAborted(
                reason="InterAI authorization unavailable or invalid; execution denied",
                source="interai",
            ) from exc

    return gate


# Register this gate after any PRE_TOOL_CALL hooks that may mutate tool_input.
# Production coverage must include every tool/path capable of the same effect.
interai_pre_tool_gate = build_interai_gate()
on(
    InterceptionPoint.PRE_TOOL_CALL,
    tools=["release_vendor_payment"],
)(interai_pre_tool_gate)
