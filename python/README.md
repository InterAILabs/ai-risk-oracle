# Python SDK

Hosted API client for InterAI Risk Oracle. It uses Certifi's portable CA bundle
by default and also accepts a custom `ssl_context` in the constructor.

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
        "type": "tool_call",
        "description": "Send account notice",
        "external_side_effect": True,
    },
    "context": {
        "agent_id": "agent_123",
        "environment": "production",
        "user_confirmation": False,
    },
    "policy": {
        "max_risk_level": "medium",
        "require_trust_receipt": True,
        "require_human_review_above": 0.75,
    },
}, idempotency_key="stable-business-operation-id")
```

If the idempotency key is omitted, the client creates a UUID for the call. Use
a stable business-operation key when retrying the same action.
