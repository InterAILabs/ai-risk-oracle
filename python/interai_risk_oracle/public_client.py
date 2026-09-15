from __future__ import annotations

import ssl
from typing import Any

from .client import (
    InterAIRiskOracleClient as BaseInterAIRiskOracleClient,
    InterAIError,
    OracleHttpError,
)

SDK_VERSION = "0.1.7-beta"
Json = dict[str, Any]


class InterAIRiskOracleClient(BaseInterAIRiskOracleClient):
    """Package-facing client with the complete builder onboarding surface."""

    def __init__(
        self,
        *,
        base_url: str,
        api_key: str | None = None,
        client_name: str | None = None,
        timeout_seconds: float = 30.0,
        ssl_context: ssl.SSLContext | None = None,
    ) -> None:
        super().__init__(
            base_url=base_url,
            api_key=api_key,
            client_name=client_name or f"python-sdk/{SDK_VERSION}",
            timeout_seconds=timeout_seconds,
            ssl_context=ssl_context,
        )

    def onboard(
        self,
        *,
        name: str | None = None,
        account_id: str | None = None,
        api_key_name: str | None = None,
        recommended_topup_usdc: str | None = None,
        scope: str | None = None,
    ) -> Json:
        if scope is not None and scope not in {"standard", "demo_trial"}:
            raise ValueError("scope must be 'standard' or 'demo_trial'")
        body = {
            key: value
            for key, value in {
                "name": name,
                "account_id": account_id,
                "api_key_name": api_key_name,
                "recommended_topup_usdc": recommended_topup_usdc,
                "scope": scope,
            }.items()
            if value is not None
        }
        result = self._request("POST", "/onboard", body=body)
        api_key = result.get("api_key") if isinstance(result, dict) else None
        if isinstance(api_key, str) and api_key:
            self.api_key = api_key
        return result

    def get_trust_receipt(self, receipt_id: str) -> Json:
        result = self.get_trust_receipt_reference(receipt_id)
        if isinstance(result, dict) and result.get("visibility") == "public_summary":
            raise ValueError("Complete receipt requires the owning account API key")
        return result


__all__ = [
    "InterAIRiskOracleClient",
    "InterAIError",
    "OracleHttpError",
    "SDK_VERSION",
]
