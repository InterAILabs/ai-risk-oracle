from __future__ import annotations

from typing import Any

import pytest
import requests
from crewai.hooks import HookAborted
from crewai.hooks.tool_hooks import (
    ToolCallHookContext,
    clear_before_tool_call_hooks,
    register_before_tool_call_hook,
    run_before_tool_call_hooks,
)

from interai_hook import build_interai_gate


@pytest.fixture(autouse=True)
def _clear_hooks():
    clear_before_tool_call_hooks()
    yield
    clear_before_tool_call_hooks()


def _ctx() -> ToolCallHookContext:
    return ToolCallHookContext(
        tool_name="release_vendor_payment",
        tool_input={"vendor_id": "vendor-a", "amount_usd": 250},
        tool=object(),  # Runtime hook logic only needs identity + mutable input.
    )


def _run_like_crewai(hook) -> tuple[bool, list[dict[str, Any]]]:
    executed: list[dict[str, Any]] = []
    register_before_tool_call_hook(hook)
    ctx = _ctx()
    blocked = run_before_tool_call_hooks(ctx)
    if not blocked:
        # Simulates the side-effect seam immediately after CrewAI's hook check.
        executed.append(dict(ctx.tool_input))
    return blocked, executed


def test_naive_timeout_is_fail_open_in_crewai_hook_dispatch():
    def naive_external_oracle(_ctx):
        raise TimeoutError("oracle timed out")

    blocked, executed = _run_like_crewai(naive_external_oracle)

    assert blocked is False
    assert executed == [{"vendor_id": "vendor-a", "amount_usd": 250}]


def test_explicit_allow_executes():
    gate = build_interai_gate(
        lambda _tool, _args: {
            "recommended_action": "allow",
            "policy_result": "allow",
            "trust_receipt_id": "receipt-allow",
        }
    )

    blocked, executed = _run_like_crewai(gate)

    assert blocked is False
    assert len(executed) == 1


@pytest.mark.parametrize(
    "payload",
    [
        {"recommended_action": "block", "policy_result": "block"},
        {"recommended_action": "review_required", "policy_result": "review_required"},
        {"recommended_action": "allow", "policy_result": "block"},
        {"recommended_action": "review_required", "policy_result": "allow"},
    ],
)
def test_non_allow_decisions_block(payload):
    gate = build_interai_gate(lambda _tool, _args: payload)

    blocked, executed = _run_like_crewai(gate)

    assert blocked is True
    assert executed == []


@pytest.mark.parametrize(
    "failure",
    [
        TimeoutError("oracle timed out"),
        requests.HTTPError("502 Bad Gateway"),
        requests.ConnectionError("connection failed"),
        ValueError("malformed JSON"),
    ],
)
def test_oracle_failures_fail_closed(failure):
    def provider(_tool, _args):
        raise failure

    gate = build_interai_gate(provider)
    blocked, executed = _run_like_crewai(gate)

    assert blocked is True
    assert executed == []


@pytest.mark.parametrize(
    "payload",
    [
        {"recommended_action": "allow"},
        {"recommended_action": "unknown", "policy_result": "allow"},
        {"recommended_action": "allow", "policy_result": None},
        {},
    ],
)
def test_invalid_decision_payloads_fail_closed(payload):
    gate = build_interai_gate(lambda _tool, _args: payload)

    blocked, executed = _run_like_crewai(gate)

    assert blocked is True
    assert executed == []


def test_gate_raises_hook_aborted_for_provider_failure_when_called_directly():
    def timeout_provider(_tool, _args):
        raise TimeoutError("oracle timed out")

    gate = build_interai_gate(timeout_provider)

    with pytest.raises(HookAborted) as exc:
        gate(_ctx())

    assert exc.value.source == "interai"
