from interai_middleware import AgentAction, execute_with_interai_gate


SAFE_LOOKUP_ACTION: AgentAction = {
    "type": "read_only_lookup",
    "name": "check_order_status",
    "description": "Read a demo order status in a sandbox",
    "external_side_effect": False,
    "irreversible": False,
}


def fake_sandbox_executor(action: AgentAction):
    return {
        "executed": True,
        "action_name": action["name"],
        "sandbox_result": "order_status: ready_for_review",
    }


def main():
    result = execute_with_interai_gate(SAFE_LOOKUP_ACTION, fake_sandbox_executor)

    if result["status"] == "executed":
        print("Tool executed in sandbox", result["result"])
    elif result["status"] == "review_required":
        print(
            "Route to supervisor",
            {
                "reason": result["review_reason"],
                "trust_receipt_id": result["trust_receipt_id"],
            },
        )
    else:
        print(
            "Action blocked",
            {
                "reason": result["block_reason"],
                "trust_receipt_id": result["trust_receipt_id"],
            },
        )


if __name__ == "__main__":
    main()
