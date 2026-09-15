# Python SDK

Hosted API client for InterAI Risk Oracle. It uses Certifi's portable CA bundle by default and also accepts a custom `ssl_context` in the constructor.

Package version: `interai-risk-oracle==0.1.7b0`.

```bash
pip install interai-risk-oracle==0.1.7b0
```

## Zero-funding builder trial

A new builder can reach a first hosted verification without moving funds. The controlled demo trial is bounded by InterAI's trial TTL, per-client limits, shared budget, and maximum-verification count.

```python
from interai_risk_oracle import InterAIRiskOracleClient

client = InterAIRiskOracleClient(
    base_url="https://api.interailabs.dev",
)

onboarding = client.onboard(
    name="my-agent",
    scope="demo_trial",
)

decision = client.verify({
    "use_case": "agent-before-tool-execution",
    "action": {
        "type": "read_only_lookup",
        "name": "check_order_status",
        "description": "Read an order status in a sandbox",
        "external_side_effect": False,
        "irreversible": False,
    },
    "context": {
        "agent_id": "my-agent",
        "environment": "sandbox",
        "user_confirmation": True,
    },
    "policy": {"require_trust_receipt": True},
})

receipt = client.get_trust_receipt(decision["trust_receipt_id"])
```

`onboard()` stores the returned API key on the client when one is issued. The demo trial is for bounded integration evaluation; it is not transferable funding and does not bypass normal production funding requirements.

## Funded builder workflow

The same client can create a standard account, inspect account state, quote usage, and manage a prepaid top-up without hand-building HTTP requests:

```python
from interai_risk_oracle import InterAIRiskOracleClient

client = InterAIRiskOracleClient(
    base_url="https://api.interailabs.dev",
)

client.onboard(name="my-funded-agent", scope="standard")
account = client.me()
quote = client.quote(mode="fast")
topup = client.create_topup("0.10")
```

You can also set a key explicitly with `set_api_key()`.

Top-up helpers cover `create_topup()`, `topup_status()`, and `confirm_topup()`. Account helpers include `me()`, `ledger()`, and `usage()`. HTTP failures raise `InterAIError` (also exported as `OracleHttpError`) with `status`, structured API `code`, headers, body, and parsed x402 payment requirements when present.

## Pre-execution verification

```python
import os

from interai_risk_oracle import InterAIRiskOracleClient

client = InterAIRiskOracleClient(
    base_url="https://api.interailabs.dev",
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

`get_trust_receipt()` requires the owning API key and returns complete receipt evidence. Use `get_trust_receipt_reference()` when an anonymous existence-only public summary is intentionally sufficient. Signature-verification helpers remain available through `verify_trust_receipt_signature()`, along with `trust_receipts()` and `trust_reputation()`.