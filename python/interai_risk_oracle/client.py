from __future__ import annotations

import json
import ssl
import urllib.error
import urllib.request
import uuid
from typing import Any

try:
    import certifi
except ImportError:  # Keep direct source-checkout usage working before installation.
    certifi = None


def _portable_ssl_context() -> ssl.SSLContext:
    if certifi is not None:
        return ssl.create_default_context(cafile=certifi.where())
    return ssl.create_default_context()


class InterAIError(RuntimeError):
    def __init__(self, status: int, body: Any) -> None:
        super().__init__(f"InterAI request failed: {status} {body}")
        self.status = status
        self.body = body


class InterAIRiskOracleClient:
    def __init__(
        self,
        *,
        base_url: str,
        api_key: str | None = None,
        client_name: str = "python-sdk/0.1.3-beta",
        ssl_context: ssl.SSLContext | None = None,
    ) -> None:
        self.base_url = base_url.rstrip("/")
        self.api_key = api_key
        self.client_name = client_name
        self.ssl_context = ssl_context or _portable_ssl_context()

    def _request(
        self,
        method: str,
        path: str,
        *,
        body: dict[str, Any] | None = None,
        headers: dict[str, str] | None = None,
    ) -> dict[str, Any]:
        request = urllib.request.Request(
            f"{self.base_url}{path}",
            data=json.dumps(body).encode("utf-8") if body is not None else None,
            headers={
                **({"content-type": "application/json"} if body is not None else {}),
                "x-interai-client": self.client_name,
                **({"authorization": f"Bearer {self.api_key}"} if self.api_key else {}),
                **(headers or {}),
            },
            method=method,
        )
        try:
            with urllib.request.urlopen(
                request, timeout=30, context=self.ssl_context
            ) as response:
                return json.loads(response.read().decode("utf-8"))
        except urllib.error.HTTPError as error:
            raw = error.read().decode("utf-8")
            try:
                error_body: Any = json.loads(raw)
            except json.JSONDecodeError:
                error_body = raw
            raise InterAIError(error.code, error_body) from error

    def verify(
        self,
        request_body: dict[str, Any],
        idempotency_key: str | None = None,
    ) -> dict[str, Any]:
        return self._request(
            "POST",
            "/verify",
            body=request_body,
            headers={"x-idempotency-key": idempotency_key or str(uuid.uuid4())},
        )

    def get_trust_receipt(self, receipt_id: str) -> dict[str, Any]:
        from urllib.parse import quote

        return self._request("GET", f"/trust/receipts/{quote(receipt_id, safe='')}")

    def verify_trust_receipt_signature(
        self, lookup: dict[str, Any]
    ) -> dict[str, Any]:
        receipt = lookup.get("receipt")
        verification = lookup.get("verification")
        if not isinstance(receipt, dict) or not isinstance(verification, dict):
            raise ValueError("Expected a trust receipt lookup response")
        receipt_id = receipt.get("receipt_id")
        signature = verification.get("signature")
        signed_payload = verification.get("signed_payload")
        if not all(isinstance(value, str) and value for value in (
            receipt_id, signature, signed_payload
        )):
            raise ValueError("Trust receipt lookup does not contain a signed payload")
        return self._request(
            "POST",
            "/trust/verify-signature",
            body={
                "receipt_id": receipt_id,
                "signed_payload": signed_payload,
                "signature": signature,
                "signature_alg": verification.get("signature_alg"),
            },
        )
