from __future__ import annotations

import json
import urllib.error
import urllib.request
import uuid
from typing import Any


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
        client_name: str = "python-sdk/0.1.2-beta",
    ) -> None:
        self.base_url = base_url.rstrip("/")
        self.api_key = api_key
        self.client_name = client_name

    def verify(
        self,
        request_body: dict[str, Any],
        idempotency_key: str | None = None,
    ) -> dict[str, Any]:
        request = urllib.request.Request(
            f"{self.base_url}/verify",
            data=json.dumps(request_body).encode("utf-8"),
            headers={
                "content-type": "application/json",
                "x-idempotency-key": idempotency_key or str(uuid.uuid4()),
                "x-interai-client": self.client_name,
                **({"authorization": f"Bearer {self.api_key}"} if self.api_key else {}),
            },
            method="POST",
        )

        try:
            with urllib.request.urlopen(request, timeout=30) as response:
                return json.loads(response.read().decode("utf-8"))
        except urllib.error.HTTPError as error:
            raw = error.read().decode("utf-8")
            try:
                body: Any = json.loads(raw)
            except json.JSONDecodeError:
                body = raw
            raise InterAIError(error.code, body) from error
