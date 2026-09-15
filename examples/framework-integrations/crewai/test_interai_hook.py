from __future__ import annotations

from copy import deepcopy
from datetime import datetime, timedelta, timezone
from typing import Any

import pytest
import requests
from crewai.hooks import HookAborted
from crewai.hooks.tool_hooks import (
    ToolCallHookContext,
    clear_before_tool_call_hooks,
    register_before_tool_call_hook,
    run_before_tool_call_hooks,
)

import interai_hook
from interai_hook import build_interai_gate


@pytest.fixture(autouse=True)
def _clear_hooks(monkeypatch):
    clear_before_tool_call_hooks()
    interai_hook._consumed_authorizations.clear()
    monkeypatch.setenv("INTERAI_WORKSPACE_ID", "workspace-test")
    monkeypatch.setenv("INTERAI_API_KEY", "test-key")
    yield
    clear_before_tool_call_hooks()
    interai_hook._consumed_authorizations.clear()


def _ctx() -> ToolCallHookContext:
    return ToolCallHookContext(
        tool_name="release_vendor_payment",
        tool_input={"vendor_id": "vendor-a", "amount_usd": 250},
        tool=object(),
    )


def _run_like_crewai(hook) -> tuple[bool, list[dict[str, Any]]]:
    executed: list[dict[str, Any]] = []
    register_before_tool_call_hook(hook)
    ctx = _ctx()
    blocked = run_before_tool_call_hooks(ctx)
    if not blocked:
        executed.append(dict(ctx.tool_input))
    return blocked, executed


def _noop_allow_validator(_payload, _request):
    return None


def _allow_payload(request: dict[str, Any], *, expired: bool = False) -> dict[str, Any]:
    intent = {
        "schema": "interai-canonical-execution-intent/v2",
        "action_authority": "host_attested_canonical",
        "canonical_action": deepcopy(request["action"]),
        "evaluation_context": {},
        "authoritative_context": {"host_attested": deepcopy(request["execution_context"])},
        "policy_authority": {},
    }
    digest = interai_hook._execution_intent_digest(intent)
    now = datetime.now(timezone.utc)
    expires_at = now - timedelta(seconds=1) if expired else now + timedelta(seconds=60)
    return {
        "request_contract": "autonomous_execution",
        "decision_id": "receipt-1",
        "recommended_action": "allow",
        "policy_result": "allow",
        "trust_receipt_id": "receipt-1",
        "execution_intent_digest": digest,
        "execution_intent": intent,
        "execution_authorization": {
            "schema": "interai-execution-authorization/v1",
            "decision_id": "receipt-1",
            "decision": "allow",
            "execution_intent_digest": digest,
            "issued_at": (now - timedelta(seconds=2)).isoformat(),
            "expires_at": expires_at.isoformat(),
            "single_use": True,
        },
    }


class _FakeResponse:
    def __init__(self, payload: dict[str, Any], status_code: int = 200):
        self._payload = deepcopy(payload)
        self.status_code = status_code

    def raise_for_status(self) -> None:
        if self.status_code >= 400:
            raise requests.HTTPError(f"HTTP {self.status_code}")

    def json(self) -> dict[str, Any]:
        return deepcopy(self._payload)


def _install_receipt_transport(
    monkeypatch,
    payload: dict[str, Any],
    *,
    signature_valid: bool = True,
    receipt_authorization: dict[str, Any] | None = None,
    signed_payload: str = '{"opaque":"bytes-must-not-be-reserialized"}',
) -> list[dict[str, Any]]:
    receipt = {
        "receipt_schema_version": "trust-receipt/v2",
        "receipt_id": payload["trust_receipt_id"],
        "execution_intent_digest": payload["execution_intent_digest"],
        "execution_authorization": deepcopy(
            receipt_authorization
            if receipt_authorization is not None
            else payload["execution_authorization"]
        ),
        "final_decision": "allow",
    }
    lookup = {
        "ok": True,
        "receipt": receipt,
        "verification": {
            "signed": True,
            "signature": "deadbeef",
            "signature_alg": "hmac-sha256",
            "signed_payload": signed_payload,
            "signature_valid": True,
        },
    }
    verification_requests: list[dict[str, Any]] = []

    def fake_get(url, *, headers, timeout):
        assert url.endswith("/trust/receipts/receipt-1")
        assert headers["Authorization"] == "Bearer test-key"
        assert timeout == 10
        return _FakeResponse(lookup)

    def fake_post(url, *, headers, json, timeout):
        assert url.endswith("/trust/verify-signature")
        assert headers["Authorization"] == "Bearer test-key"
        assert timeout == 10
        verification_requests.append(deepcopy(json))
        return _FakeResponse({"valid": signature_valid})

    monkeypatch.setattr(interai_hook.requests, "get", fake_get)
    monkeypatch.setattr(interai_hook.requests, "post", fake_post)
    return verification_requests


def test_naive_timeout_is_fail_open_in_crewai_hook_dispatch():
    def naive_external_oracle(_ctx):
        raise TimeoutError("oracle timed out")

    blocked, executed = _run_like_crewai(naive_external_oracle)

    assert blocked is False
    assert executed == [{"vendor_id": "vendor-a", "amount_usd": 250}]


def test_explicit_validated_allow_executes():
    gate = build_interai_gate(
        lambda _request: {
            "recommended_action": "allow",
            "policy_result": "allow",
        },
        _noop_allow_validator,
    )

    blocked, executed = _run_like_crewai(gate)

    assert blocked is False
    assert len(executed) == 1


@pytest.mark.parametrize(
    "payload",
    [
        {"recommended_action": "block", "policy_result": "block"},
        {"recommended_action": "review_required", "policy_result": "review_required"},
        {"recommended_action": "allow", "policy_result": "block"},
        {"recommended_action": "review_required", "policy_result": "allow"},
    ],
)
def test_non_allow_decisions_block(payload):
    gate = build_interai_gate(lambda _request: payload, _noop_allow_validator)

    blocked, executed = _run_like_crewai(gate)

    assert blocked is True
    assert executed == []


@pytest.mark.parametrize(
    "failure",
    [
        TimeoutError("oracle timed out"),
        requests.HTTPError("502 Bad Gateway"),
        requests.ConnectionError("connection failed"),
        ValueError("malformed JSON"),
    ],
)
def test_oracle_failures_fail_closed(failure):
    def provider(_request):
        raise failure

    gate = build_interai_gate(provider, _noop_allow_validator)
    blocked, executed = _run_like_crewai(gate)

    assert blocked is True
    assert executed == []


@pytest.mark.parametrize(
    "payload",
    [
        {"recommended_action": "allow"},
        {"recommended_action": "unknown", "policy_result": "allow"},
        {"recommended_action": "allow", "policy_result": None},
        {},
    ],
)
def test_invalid_decision_payloads_fail_closed(payload):
    gate = build_interai_gate(lambda _request: payload, _noop_allow_validator)

    blocked, executed = _run_like_crewai(gate)

    assert blocked is True
    assert executed == []


def test_allow_validator_failure_is_converted_to_hook_aborted():
    def validator(_payload, _request):
        raise ValueError("authorization digest mismatch")

    gate = build_interai_gate(
        lambda _request: {
            "recommended_action": "allow",
            "policy_result": "allow",
        },
        validator,
    )

    blocked, executed = _run_like_crewai(gate)

    assert blocked is True
    assert executed == []


def test_request_binds_exact_tool_and_arguments():
    captured = {}

    def provider(request):
        captured.update(request)
        return {"recommended_action": "allow", "policy_result": "allow"}

    gate = build_interai_gate(provider, _noop_allow_validator)
    blocked, _ = _run_like_crewai(gate)

    assert blocked is False
    assert captured["action"]["tool_id"] == "crewai.release_vendor_payment"
    assert captured["action"]["arguments"] == {
        "vendor_id": "vendor-a",
        "amount_usd": 250,
    }
    assert captured["execution_context"]["workspace_id"] == "workspace-test"


def test_local_authorization_validation_checks_digest_ttl_and_single_use(monkeypatch):
    request = interai_hook._build_verify_request(_ctx())
    payload = _allow_payload(request)

    monkeypatch.setattr(interai_hook, "_verify_receipt_signature", lambda *_args: None)
    interai_hook.validate_allow_for_dispatch(payload, request)

    with pytest.raises(interai_hook.InvalidInterAIDecision, match="already consumed"):
        interai_hook.validate_allow_for_dispatch(payload, request)


def test_json_integer_and_integral_float_bind_as_same_number(monkeypatch):
    request = interai_hook._build_verify_request(_ctx())
    request["action"]["arguments"]["amount_usd"] = 250.0
    request["action"]["amount_usd"] = 250.0
    payload = _allow_payload(request)
    payload["execution_intent"]["canonical_action"]["arguments"]["amount_usd"] = 250
    payload["execution_intent"]["canonical_action"]["amount_usd"] = 250
    digest = interai_hook._execution_intent_digest(payload["execution_intent"])
    payload["execution_intent_digest"] = digest
    payload["execution_authorization"]["execution_intent_digest"] = digest

    monkeypatch.setattr(interai_hook, "_verify_receipt_signature", lambda *_args: None)
    interai_hook.validate_allow_for_dispatch(payload, request)


def test_expired_execution_authorization_fails_closed(monkeypatch):
    request = interai_hook._build_verify_request(_ctx())
    payload = _allow_payload(request, expired=True)

    monkeypatch.setattr(interai_hook, "_verify_receipt_signature", lambda *_args: None)
    with pytest.raises(interai_hook.InvalidInterAIDecision, match="expired or invalid"):
        interai_hook.validate_allow_for_dispatch(payload, request)


def test_changed_final_action_fails_closed(monkeypatch):
    request = interai_hook._build_verify_request(_ctx())
    payload = _allow_payload(request)
    payload["execution_intent"]["canonical_action"] = {
        **request["action"],
        "arguments": {"vendor_id": "vendor-b", "amount_usd": 250},
    }

    monkeypatch.setattr(interai_hook, "_verify_receipt_signature", lambda *_args: None)
    with pytest.raises(interai_hook.InvalidInterAIDecision, match="differs"):
        interai_hook.validate_allow_for_dispatch(payload, request)


def test_real_v2_receipt_verification_preserves_opaque_signed_payload(monkeypatch):
    request = interai_hook._build_verify_request(_ctx())
    payload = _allow_payload(request)
    opaque = '{"z":1,"amount":250.00,"a":"keep-exactly"}'
    verification_requests = _install_receipt_transport(
        monkeypatch,
        payload,
        signed_payload=opaque,
    )

    interai_hook.validate_allow_for_dispatch(payload, request)

    assert len(verification_requests) == 1
    sent = verification_requests[0]
    assert sent["receipt_id"] == "receipt-1"
    assert sent["signed_payload"] == opaque
    assert sent["signature"] == "deadbeef"
    assert sent["signature_alg"] == "hmac-sha256"
    assert sent["receipt"]["execution_authorization"] == payload["execution_authorization"]


def test_invalid_receipt_signature_fails_closed(monkeypatch):
    request = interai_hook._build_verify_request(_ctx())
    payload = _allow_payload(request)
    _install_receipt_transport(monkeypatch, payload, signature_valid=False)

    with pytest.raises(interai_hook.InvalidInterAIDecision, match="signature is invalid"):
        interai_hook.validate_allow_for_dispatch(payload, request)


def test_signed_receipt_authorization_mismatch_fails_closed(monkeypatch):
    request = interai_hook._build_verify_request(_ctx())
    payload = _allow_payload(request)
    altered = deepcopy(payload["execution_authorization"])
    altered["expires_at"] = (
        datetime.now(timezone.utc) + timedelta(minutes=10)
    ).isoformat()
    _install_receipt_transport(
        monkeypatch,
        payload,
        receipt_authorization=altered,
    )

    with pytest.raises(
        interai_hook.InvalidInterAIDecision,
        match="Authorization differs from the signed receipt",
    ):
        interai_hook.validate_allow_for_dispatch(payload, request)


def test_nested_host_attested_context_is_bound_exactly(monkeypatch):
    request = interai_hook._build_verify_request(_ctx())
    request["execution_context"]["delegation"] = {
        "principal": {"workspace": "workspace-test", "roles": ["buyer", "operator"]},
        "constraints": {"max_amount_usd": 500, "regions": ["AR", "UY"]},
    }
    payload = _allow_payload(request)
    _install_receipt_transport(monkeypatch, payload)

    interai_hook.validate_allow_for_dispatch(payload, request)

    tampered_request = deepcopy(request)
    tampered_request["execution_context"]["delegation"]["constraints"][
        "max_amount_usd"
    ] = 501
    interai_hook._consumed_authorizations.clear()
    with pytest.raises(interai_hook.InvalidInterAIDecision, match="Execution context mismatch"):
        interai_hook.validate_allow_for_dispatch(payload, tampered_request)


def test_expired_authorization_blocks_crewai_before_dispatch(monkeypatch):
    signature_checked = False

    def should_not_verify_signature(*_args):
        nonlocal signature_checked
        signature_checked = True
        raise AssertionError("expired authorization must fail before signature lookup")

    def provider(request):
        return _allow_payload(request, expired=True)

    monkeypatch.setattr(interai_hook, "_verify_receipt_signature", should_not_verify_signature)
    gate = build_interai_gate(provider, interai_hook.validate_allow_for_dispatch)

    blocked, executed = _run_like_crewai(gate)

    assert blocked is True
    assert executed == []
    assert signature_checked is False
