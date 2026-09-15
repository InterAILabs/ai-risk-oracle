from __future__ import annotations

import json
import ssl
import urllib.error
import urllib.parse
import urllib.request
import uuid
from typing import Any, Mapping

try:
    import certifi
except ImportError:  # Keep direct source-checkout usage working before installation.
    certifi = None


SDK_VERSION = "0.1.3-beta"
Json = dict[str, Any]


def _portable_ssl_context() -> ssl.SSLContext:
    if certifi is not None:
        return ssl.create_default_context(cafile=certifi.where())
    return ssl.create_default_context()


class InterAIError(RuntimeError):
    def __init__(
        self,
        *,
        method: str,
        path: str,
        status: int,
        body: Any,
        headers: Mapping[str, str],
    ) -> None:
        super().__init__(f"InterAI request failed: {method} {path} {status} {body}")
        self.method = method
        self.path = path
        self.status = status
        self.body = body
        self.headers = dict(headers)
        self.code = (
            str(body.get("error"))
            if isinstance(body, Mapping) and isinstance(body.get("error"), str)
            else None
        )
        self.payment_required = (
            body
            if status == 402
            and isinstance(body, dict)
            and body.get("x402Version") == 2
            and isinstance(body.get("accepts"), list)
            else None
        )


OracleHttpError = InterAIError


class InterAIRiskOracleClient:
    def __init__(
        self,
        *,
        base_url: str,
        api_key: str | None = None,
        client_name: str = f"python-sdk/{SDK_VERSION}",
        timeout_seconds: float = 30.0,
        ssl_context: ssl.SSLContext | None = None,
    ) -> None:
        if timeout_seconds <= 0:
            raise ValueError("timeout_seconds must be greater than zero")
        self.base_url = base_url.rstrip("/")
        self.api_key = api_key
        self.client_name = client_name
        self.timeout_seconds = timeout_seconds
        self.ssl_context = ssl_context or _portable_ssl_context()

    def set_api_key(self, api_key: str) -> None:
        self.api_key = api_key

    def _request(
        self,
        method: str,
        path: str,
        *,
        body: Any | None = None,
        headers: Mapping[str, str] | None = None,
        timeout_seconds: float | None = None,
    ) -> Any:
        request_headers = {
            **({"content-type": "application/json"} if body is not None else {}),
            "x-interai-client": self.client_name,
            **(dict(headers or {})),
        }
        if self.api_key:
            request_headers["authorization"] = f"Bearer {self.api_key}"

        effective_timeout = (
            self.timeout_seconds if timeout_seconds is None else timeout_seconds
        )
        if effective_timeout <= 0:
            raise ValueError("timeout_seconds must be greater than zero")

        request = urllib.request.Request(
            f"{self.base_url}{path}",
            data=json.dumps(body).encode("utf-8") if body is not None else None,
            headers=request_headers,
            method=method,
        )
        try:
            with urllib.request.urlopen(
                request,
                timeout=effective_timeout,
                context=self.ssl_context,
            ) as response:
                return _decode_response(response.read())
        except urllib.error.HTTPError as error:
            parsed = _decode_response(error.read())
            raise InterAIError(
                method=method,
                path=path,
                status=error.code,
                body=parsed,
                headers=dict(error.headers.items()),
            ) from error

    def get_pricing(self) -> Json:
        return self._request("GET", "/pricing")

    def get_discovery_bundle(self) -> Json:
        return self._request("GET", "/.well-known/discovery-bundle.json")

    def onboard(
        self,
        *,
        name: str | None = None,
        account_id: str | None = None,
        api_key_name: str | None = None,
        recommended_topup_usdc: str | None = None,
    ) -> Json:
        body = {
            key: value
            for key, value in {
                "name": name,
                "account_id": account_id,
                "api_key_name": api_key_name,
                "recommended_topup_usdc": recommended_topup_usdc,
            }.items()
            if value is not None
        }
        result = self._request("POST", "/onboard", body=body)
        api_key = result.get("api_key") if isinstance(result, dict) else None
        if isinstance(api_key, str) and api_key:
            self.api_key = api_key
        return result

    def me(self) -> Json:
        return self._request("GET", "/me")

    def ledger(self, limit: int = 20) -> Json:
        query = urllib.parse.urlencode({"limit": limit})
        return self._request("GET", f"/ledger?{query}")

    def usage(self, limit: int = 20) -> Json:
        query = urllib.parse.urlencode({"limit": limit})
        return self._request("GET", f"/usage?{query}")

    def quote(
        self,
        *,
        service: str = "verify",
        mode: str = "fast",
        items_count: int | None = None,
    ) -> Json:
        body: Json = {"service": service, "mode": mode}
        if items_count is not None:
            body["items_count"] = items_count
        return self._request("POST", "/quote", body=body)

    def create_topup(self, amount_usdc: str = "0.10") -> Json:
        return self._request(
            "POST",
            "/topup/create",
            body={"amount_usdc": amount_usdc},
        )

    def topup_status(self, topup_id: str) -> Json:
        encoded = urllib.parse.quote(topup_id, safe="")
        return self._request("GET", f"/topup/{encoded}")

    def confirm_topup(self, topup_id: str, tx_hash: str) -> Json:
        return self._request(
            "POST",
            "/topup/confirm",
            headers={
                "X-Topup-Id": topup_id,
                "X-Tx-Hash": tx_hash,
            },
        )

    def verify(
        self,
        request_body: Mapping[str, Any],
        idempotency_key: str | None = None,
        *,
        timeout_seconds: float | None = None,
    ) -> Json:
        return self._request(
            "POST",
            "/verify",
            body=dict(request_body),
            headers={"x-idempotency-key": idempotency_key or str(uuid.uuid4())},
            timeout_seconds=timeout_seconds,
        )

    def verify_batch(
        self,
        requests: list[Mapping[str, Any]],
        idempotency_key: str | None = None,
        *,
        timeout_seconds: float | None = None,
    ) -> Json:
        return self._request(
            "POST",
            "/verify/batch",
            body={"items": [dict(item) for item in requests]},
            headers={"x-idempotency-key": idempotency_key or str(uuid.uuid4())},
            timeout_seconds=timeout_seconds,
        )

    def trust_reputation(self, domains_limit: int = 20) -> Json:
        query = urllib.parse.urlencode({"domains_limit": domains_limit})
        return self._request("GET", f"/trust/reputation?{query}")

    def trust_receipts(self, limit: int = 50) -> Json:
        query = urllib.parse.urlencode({"limit": limit})
        return self._request("GET", f"/trust/receipts?{query}")

    def get_trust_receipt_reference(self, receipt_id: str) -> Json:
        encoded = urllib.parse.quote(receipt_id, safe="")
        return self._request("GET", f"/trust/receipts/{encoded}")

    def get_trust_receipt(self, receipt_id: str) -> Json:
        return self.get_trust_receipt_reference(receipt_id)

    def verify_trust_receipt_signature(
        self, lookup: Mapping[str, Any]
    ) -> Json:
        receipt = lookup.get("receipt")
        verification = lookup.get("verification")
        if not isinstance(receipt, Mapping) or not isinstance(verification, Mapping):
            raise ValueError("Expected a trust receipt lookup response")
        receipt_id = receipt.get("receipt_id")
        signature = verification.get("signature")
        signed_payload = verification.get("signed_payload")
        if not all(
            isinstance(value, str) and value
            for value in (receipt_id, signature, signed_payload)
        ):
            raise ValueError("Trust receipt lookup does not contain a signed payload")
        return self._request(
            "POST",
            "/trust/verify-signature",
            body={
                "receipt_id": receipt_id,
                "receipt": dict(receipt),
                "signed_payload": signed_payload,
                "signature": signature,
                "signature_alg": verification.get("signature_alg"),
            },
        )


def _decode_response(raw: bytes) -> Any:
    text = raw.decode("utf-8")
    if not text:
        return None
    try:
        return json.loads(text)
    except json.JSONDecodeError:
        return {"raw": text}
