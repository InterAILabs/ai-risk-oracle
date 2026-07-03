import json
import os
import time
import urllib.error
import urllib.request
from typing import Any, Callable, Dict, Optional

AgentAction = Dict[str, Any]
VerifyResponse = Dict[str, Any]
ExecutionDecision = Dict[str, Any]


def _base_url() -> str:
    return os.environ.get("INTERAI_BASE_URL", "https://ai-risk-oracle.fly.dev").rstrip("/")


def _api_key() -> str:
    return os.environ.get("INTERAI_API_KEY", "")


def _receipt_id(response: VerifyResponse) -> Optional[str]:
    receipt = response.get("trust_receipt")
    if isinstance(receipt, dict) and isinstance(receipt.get("receipt_id"), str):
        return receipt["receipt_id"]
    value = response.get("trust_receipt_id")
    return value if isinstance(value, str) else None


def _validate_verify_response(value: Any) -> VerifyResponse:
    if not isinstance(value, dict):
        raise RuntimeError("Malformed InterAI response: expected JSON object")
    if value.get("recommended_action") not in ("allow", "review_required", "block"):
        raise RuntimeError("Malformed InterAI response: missing recommended_action")
    return value


def verify_before_execution(action: AgentAction) -> VerifyResponse:
    api_key = _api_key()
    if not api_key:
        raise RuntimeError("Missing INTERAI_API_KEY")

    payload = {
        "use_case": "agent-before-tool-execution",
        "action": action,
        "context": {
            "agent_id": "example_agent_python",
            "environment": "sandbox",
            "user_confirmation": False,
        },
        "policy": {
            "max_risk_level": "medium",
            "require_trust_receipt": True,
            "amount_usd_limit": 500,
            "blocked_action_types": ["irreversible_transfer"],
            "require_human_review_above": 0.75,
        },
    }

    request = urllib.request.Request(
        f"{_base_url()}/verify",
        data=json.dumps(payload).encode("utf-8"),
        headers={
            "content-type": "application/json",
            "authorization": f"Bearer {api_key}",
            "x-idempotency-key": f"agent-middleware-python-{int(time.time() * 1000)}",
        },
        method="POST",
    )

    try:
        with urllib.request.urlopen(request, timeout=15) as response:
            text = response.read().decode("utf-8")
            return _validate_verify_response(json.loads(text))
    except urllib.error.HTTPError as error:
        body = error.read().decode("utf-8", errors="replace")
        raise RuntimeError(f"InterAI /verify failed: HTTP {error.code} {body[:300]}") from error
    except urllib.error.URLError as error:
        raise RuntimeError(f"Network failure calling InterAI: {error}") from error
    except json.JSONDecodeError as error:
        raise RuntimeError("Malformed InterAI response: non-JSON body") from error


def execute_with_interai_gate(
    action: AgentAction,
    executor: Callable[[AgentAction], Any],
) -> ExecutionDecision:
    verification = verify_before_execution(action)
    recommended_action = verification["recommended_action"]
    base = {
        "recommended_action": recommended_action,
        "risk_level": verification.get("risk_level"),
        "policy_result": verification.get("policy_result"),
        "trust_receipt_id": _receipt_id(verification),
        "verification": verification,
    }

    print(
        "InterAI decision",
        {
            "recommended_action": base["recommended_action"],
            "risk_level": base["risk_level"],
            "policy_result": base["policy_result"],
            "trust_receipt_id": base["trust_receipt_id"],
        },
    )

    if recommended_action == "allow":
        return {
            "status": "executed",
            **base,
            "result": executor(action),
        }

    if recommended_action == "review_required":
        return {
            "status": "review_required",
            **base,
            "review_reason": "InterAI requires supervisor or policy review before execution",
        }

    return {
        "status": "blocked",
        **base,
        "block_reason": "InterAI blocked this action before execution",
    }
