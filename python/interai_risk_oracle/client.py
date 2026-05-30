from __future__ import annotations

import json
import urllib.error
import urllib.request
from typing import Any


class InterAIError(RuntimeError):
    def __init__(self, status: int, body: Any) -> None:
        super().__init__(f"InterAI request failed: {status} {body}")
        self.status = status
        self.body = body


class InterAIRiskOracleClient:
    def __init__(self, *, base_url: str, api_key: str | None = None) -> None:
        self.base_url = base_url.rstrip("/")
        self.api_key = api_key

    def verify(self, request_body: dict[str, Any]) -> dict[str, Any]:
        request = urllib.request.Request(
            f"{self.base_url}/verify",
            data=json.dumps(request_body).encode("utf-8"),
            headers={
                "content-type": "application/json",
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

