from __future__ import annotations

import io
import json
import urllib.error
from unittest.mock import patch

from interai_risk_oracle import InterAIRiskOracleClient, InterAIError, SDK_VERSION


class FakeResponse:
    def __init__(self, payload: dict[str, object]) -> None:
        self.payload = payload

    def __enter__(self) -> "FakeResponse":
        return self

    def __exit__(self, *_args: object) -> None:
        return None

    def read(self) -> bytes:
        return json.dumps(self.payload).encode("utf-8")


captured: list[tuple[object, float, object]] = []


def fake_urlopen(request: object, timeout: float, context: object) -> FakeResponse:
    captured.append((request, timeout, context))
    url = request.full_url
    if url.endswith("/onboard"):
        return FakeResponse({"ok": True, "api_key": "builder-key"})
    if url.endswith("/pricing"):
        raise urllib.error.HTTPError(
            url,
            503,
            "Service Unavailable",
            {"content-type": "application/json"},
            io.BytesIO(b'{"error":"service_unavailable"}'),
        )
    if url.endswith("/topup/create"):
        return FakeResponse({"ok": True, "topup_id": "topup-1"})
    if url.endswith("/topup/topup-1"):
        return FakeResponse({"ok": True, "status": "pending"})
    if url.endswith("/topup/confirm"):
        return FakeResponse({"ok": True, "status": "confirmed"})
    if url.endswith("/verify"):
        return FakeResponse({
            "decision_id": "decision-1",
            "request_contract": "autonomous_execution",
            "recommended_action": "allow",
        })
    return FakeResponse({"ok": True})


assert SDK_VERSION == "0.1.6-beta"

client = InterAIRiskOracleClient(
    base_url="https://interai.invalid/",
    timeout_seconds=12.5,
)

with patch("urllib.request.urlopen", side_effect=fake_urlopen):
    client.onboard(name="builder-test")
    assert client.api_key == "builder-key"

    client.me()
    me_request, me_timeout, _ = captured[-1]
    me_headers = {key.lower(): value for key, value in me_request.header_items()}
    assert me_headers["authorization"] == "Bearer builder-key"
    assert me_headers["x-interai-client"] == f"python-sdk/{SDK_VERSION}"
    assert me_timeout == 12.5

    client.create_topup("0.10")
    create_request = captured[-1][0]
    assert json.loads(create_request.data.decode("utf-8"))["amount_usdc"] == "0.10"

    client.topup_status("topup-1")
    assert captured[-1][0].full_url.endswith("/topup/topup-1")

    client.confirm_topup("topup-1", "0xabc")
    confirm_headers = {
        key.lower(): value for key, value in captured[-1][0].header_items()
    }
    assert confirm_headers["x-topup-id"] == "topup-1"
    assert confirm_headers["x-tx-hash"] == "0xabc"
    assert confirm_headers["authorization"] == "Bearer builder-key"

    payload = {
        "use_case": "builder-contract",
        "action": {
            "schema": "interai-canonical-action/v1",
            "tool_id": "payments.transfer",
            "type": "payment",
            "operation": "transfer",
            "arguments": {"amount": "10"},
            "external_side_effect": True,
            "irreversible": True,
        },
        "execution_context": {
            "schema": "interai-host-execution-context/v1",
            "workspace_id": "workspace-1",
            "environment": "sandbox",
        },
        "authorization_ttl_seconds": 30,
        "external_evidence": [{"source": "test"}],
    }
    client.verify(
        payload,
        idempotency_key="stable-builder-key",
        timeout_seconds=2.0,
    )
    verify_request, verify_timeout, _ = captured[-1]
    verify_headers = {
        key.lower(): value for key, value in verify_request.header_items()
    }
    assert verify_headers["x-idempotency-key"] == "stable-builder-key"
    assert verify_timeout == 2.0
    assert json.loads(verify_request.data.decode("utf-8")) == payload

    try:
        client.get_pricing()
        raise AssertionError("Expected InterAIError")
    except InterAIError as error:
        assert error.status == 503
        assert error.code == "service_unavailable"
        assert error.method == "GET"
        assert error.path == "/pricing"

print("[OK] public Python builder contract")
