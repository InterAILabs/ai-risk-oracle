# Python SDK

Hosted API client for InterAI Risk Oracle. It uses Certifi's portable CA bundle by default and also accepts a custom `ssl_context` in the constructor.

Package version: `interai-risk-oracle==0.1.5b0`.

```bash
pip install interai-risk-oracle==0.1.5b0
```

## Builder workflow

The client can onboard a builder, retain the returned API key, inspect account state, quote usage, and manage a prepaid top-up without hand-building HTTP requests:

```python
from interai_risk_oracle import InterAIRiskOracleClient

client = InterAIRiskOracleClient(
    base_url="https://ai-risk-oracle.fly.dev",
)

onboarding = client.onboard(name="my-agent")
account = client.me()
quote = client.quote(mode="fast")
topup = client.create_topup("0.10")
```

`onboard()` stores the returned API key on the client when one is issued. You can also set a key explicitly with `set_api_key()`.

Top-up helpers cover `create_topup()`, `topup_status()`, and `confirm_topup()`. Account helpers include `me()`, `ledger()`, and `usage()`. HTTP failures raise `InterAIError` (also exported as `OracleHttpError`) with `status`, structured API `code`, headers, body, and parsed x402 payment requirements when present.

## Pre-execution verification

```python
import os

from interai_risk_oracle import InterAIRiskOracleClient

client = InterAIRiskOracleClient(
    base_url="https://ai-risk-oracle.fly.dev",
    api_key=os.environ["INTERAI_API_KEY"],
)

decision = client.verify({
    "use_case": "agent-before-tool-execution",
    "action": {
        "schema": "interai-canonical-action/v1",
        "tool_id": "notifications.send_account_notice",
        "type": "email_send",
        "operation": "send_account_notice",
        "arguments": {"account_id": "account_123"},
        "external_side_effect": True,
        "irreversible": False,
    },
    "execution_context": {
        "schema": "interai-host-execution-context/v1",
        "workspace_id": "workspace_123",
        "environment": "production",
    },
    "context": {
        "agent_id": "agent_123",
        "environment": "production",
        "user_confirmation": False,
    },
    "policy": {
        "require_trust_receipt": True,
        "require_human_review_above": 0.75,
    },
}, idempotency_key="stable-business-operation-id")
```

If the idempotency key is omitted, the client creates a UUID for the call. Use a stable business-operation key when retrying the same action. `verify_batch()` provides the corresponding bounded batch surface. Configure request timeouts with `timeout_seconds` globally or per verification call.

Receipt lookup and signature-verification helpers remain available through `get_trust_receipt()`, `get_trust_receipt_reference()`, `trust_receipts()`, `trust_reputation()`, and `verify_trust_receipt_signature()`.
