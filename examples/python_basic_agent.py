import os

from interai_risk_oracle import InterAIRiskOracleClient, OracleHttpError


def main() -> None:
    client = InterAIRiskOracleClient(
        base_url=os.getenv("ORACLE_BASE_URL", "https://ai-risk-oracle.fly.dev"),
        api_key=os.getenv("ORACLE_API_KEY"),
    )

    try:
        result = client.verify(
            {
                "prompt": "What is the capital of France?",
                "response": "Paris is the capital of France.",
                "domain": "general",
            },
            idempotency_key="python-basic-agent-example-1",
        )
    except OracleHttpError as error:
        if error.payment_required:
            accept = error.payment_required["accepts"][0]
            print(
                {
                    "status": error.status,
                    "x402_required": True,
                    "network": accept["network"],
                    "amount": accept["amount"],
                    "asset": accept["asset"],
                }
            )
            return
        raise

    print(
        {
            "trust_score": result["trust_score"],
            "risk_level": result["risk_level"],
            "receipt_id": result["trust_receipt"]["receipt_id"],
        }
    )


if __name__ == "__main__":
    main()
