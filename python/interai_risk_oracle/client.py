from __future__ import annotations

import json
import urllib.error
import urllib.parse
import urllib.request
from dataclasses import dataclass
from typing import Any, Mapping


Json = dict[str, Any]


@dataclass(frozen=True)
class VerifyInput:
    prompt: str
    response: str
    domain: str = "general"


class OracleHttpError(RuntimeError):
    def __init__(
        self,
        *,
        method: str,
        path: str,
        status: int,
        body: Any,
        headers: Mapping[str, str],
    ) -> None:
        super().__init__(f"{method} {path} failed: {status} {body}")
        self.method = method
        self.path = path
        self.status = status
        self.body = body
        self.headers = dict(headers)
        self.payment_required = (
            body
            if status == 402
            and isinstance(body, dict)
            and body.get("x402Version") == 2
            and isinstance(body.get("accepts"), list)
            else None
        )


class InterAIRiskOracleClient:
    def __init__(self, *, base_url: str, api_key: str | None = None) -> None:
        self.base_url = base_url.rstrip("/")
        self.api_key = api_key

    def set_api_key(self, api_key: str) -> None:
        self.api_key = api_key

    def _request(
        self,
        method: str,
        path: str,
        *,
        body: Any | None = None,
        headers: Mapping[str, str] | None = None,
    ) -> Any:
        request_headers = {
            **({"content-type": "application/json"} if body is not None else {}),
            **(dict(headers or {})),
        }
        if self.api_key:
            request_headers["authorization"] = f"Bearer {self.api_key}"

        encoded_body = (
            json.dumps(body).encode("utf-8") if body is not None else None
        )
        request = urllib.request.Request(
            f"{self.base_url}{path}",
            data=encoded_body,
            headers=request_headers,
            method=method,
        )

        try:
            with urllib.request.urlopen(request, timeout=30) as response:
                return _decode_response(response.read())
        except urllib.error.HTTPError as error:
            raw = error.read()
            parsed = _decode_response(raw)
            raise OracleHttpError(
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
        if isinstance(api_key, str):
            self.api_key = api_key
        return result

    def create_topup(self, amount_usdc: str = "0.01") -> Json:
        return self._request(
            "POST",
            "/topup/create",
            body={"amount_usdc": amount_usdc},
        )

    def dev_credit(self, amount_usdc: str = "0.01") -> Json:
        return self._request(
            "POST",
            "/topup/dev/credit",
            body={"amount_usdc": amount_usdc},
        )

    def verify(
        self,
        item: VerifyInput | Mapping[str, Any],
        *,
        idempotency_key: str | None = None,
    ) -> Json:
        payload = _verify_payload(item)
        return self._request(
            "POST",
            "/verify",
            body=payload,
            headers=_idempotency_header(idempotency_key),
        )

    def verify_batch(
        self,
        items: list[VerifyInput | Mapping[str, Any]],
        *,
        idempotency_key: str | None = None,
    ) -> Json:
        return self._request(
            "POST",
            "/verify/batch",
            body={"items": [_verify_payload(item) for item in items]},
            headers=_idempotency_header(idempotency_key),
        )

    def trust_reputation(self, domains_limit: int = 20) -> Json:
        query = urllib.parse.urlencode({"domains_limit": domains_limit})
        return self._request("GET", f"/trust/reputation?{query}")

    def trust_receipts(self, limit: int = 50) -> Json:
        query = urllib.parse.urlencode({"limit": limit})
        return self._request("GET", f"/trust/receipts?{query}")

    def get_trust_receipt(self, receipt_id: str) -> Json:
        encoded = urllib.parse.quote(receipt_id, safe="")
        return self._request("GET", f"/trust/receipts/{encoded}")


def _decode_response(raw: bytes) -> Any:
    text = raw.decode("utf-8")
    if not text:
        return None
    try:
        return json.loads(text)
    except json.JSONDecodeError:
        return {"raw": text}


def _verify_payload(item: VerifyInput | Mapping[str, Any]) -> Json:
    if isinstance(item, VerifyInput):
        return {
            "prompt": item.prompt,
            "response": item.response,
            "domain": item.domain,
        }
    return {
        "prompt": str(item.get("prompt", "")),
        "response": str(item.get("response", "")),
        "domain": str(item.get("domain", "general")),
    }


def _idempotency_header(idempotency_key: str | None) -> dict[str, str]:
    return {"X-Idempotency-Key": idempotency_key} if idempotency_key else {}
