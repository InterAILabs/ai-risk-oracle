# Python SDK

Minimal hosted API client for InterAI Risk Oracle.

```python
from interai_risk_oracle import InterAIRiskOracleClient

client = InterAIRiskOracleClient(
    base_url="https://ai-risk-oracle.fly.dev",
    api_key="replace-with-your-credential",
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
})
```
