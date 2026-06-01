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
    "action": {"type": "tool_call", "description": "Send account notice"},
    "context": {"agent_id": "agent_123"},
    "policy": {"max_risk_level": "medium", "require_trust_receipt": True},
})
```
