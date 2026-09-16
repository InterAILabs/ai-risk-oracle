from __future__ import annotations

import threading
import unittest
from concurrent.futures import ThreadPoolExecutor
from dataclasses import replace
from datetime import datetime, timedelta, timezone

from adapter import (
    AtomicDecisionConsumer,
    AuthorizationDenied,
    DecisionBinding,
    DelegatedAction,
    WalletPolicySnapshot,
    authorize_before_delegated_signing,
    binding_digest,
)

NOW = datetime(2026, 9, 15, 12, 0, tzinfo=timezone.utc)


def base_action() -> DelegatedAction:
    return DelegatedAction(
        chain_id=8453,
        wallet="0x1111111111111111111111111111111111111111",
        delegate="0x2222222222222222222222222222222222222222",
        target="0x3333333333333333333333333333333333333333",
        calldata_hash="0x" + "ab" * 32,
        token="0x4444444444444444444444444444444444444444",
        amount=2_500_000,
        nonce=17,
        expiry=1_800_000_000,
    )


def base_policy() -> WalletPolicySnapshot:
    return WalletPolicySnapshot(version=6, policy_hash="0x" + "cd" * 32)


def allow_response(binding: DecisionBinding, **overrides):
    response = {
        "decision": "allow",
        "issuer": "interai:test",
        "decision_id": "decision-001",
        "execution_intent_digest": binding_digest(binding),
        "policy_version": binding.policy.version,
        "policy_hash": binding.policy.policy_hash,
        "issued_at": (NOW - timedelta(seconds=1)).isoformat(),
        "expires_at": (NOW + timedelta(seconds=60)).isoformat(),
    }
    response.update(overrides)
    return response


class AdapterTests(unittest.TestCase):
    def gate(
        self,
        *,
        action=None,
        policy=None,
        provider=None,
        enabled=True,
        policy_allows=None,
        consumer=None,
        now=None,
    ):
        action = action or base_action()
        policy = policy or base_policy()
        consumer = consumer or AtomicDecisionConsumer()
        provider = provider or (lambda binding: allow_response(binding))
        policy_allows = policy_allows or (lambda _action, _policy: True)
        now = now or (lambda: NOW)
        return authorize_before_delegated_signing(
            enabled=enabled,
            read_action=lambda: action,
            read_wallet_policy=lambda: policy,
            deterministic_policy_allows=policy_allows,
            decision_provider=provider,
            known_issuer="interai:test",
            consume_decision_id=consumer.consume,
            now=now,
        )

    def assert_denied(self, reason, fn):
        with self.assertRaisesRegex(AuthorizationDenied, reason):
            fn()

    def test_baseline_disabled_preserves_existing_flow(self):
        result = self.gate(enabled=False, provider=lambda _binding: (_ for _ in ()).throw(AssertionError()))
        self.assertEqual(result["status"], "baseline_disabled")

    def test_valid_allow_may_reach_signing(self):
        result = self.gate()
        self.assertEqual(result["status"], "allow")
        self.assertTrue(result["may_proceed_to_signing"])

    def test_block_stops(self):
        self.assert_denied("interai_block", lambda: self.gate(provider=lambda b: allow_response(b, decision="block")))

    def test_review_required_stops(self):
        self.assert_denied("review_required", lambda: self.gate(provider=lambda b: allow_response(b, decision="review_required")))

    def test_timeout_fails_closed(self):
        def timeout(_binding):
            raise TimeoutError("synthetic timeout")
        self.assert_denied("oracle_timeout", lambda: self.gate(provider=timeout))

    def test_malformed_response_fails_closed(self):
        self.assert_denied("malformed_response:decision", lambda: self.gate(provider=lambda _b: {"decision": "maybe"}))

    def test_unknown_issuer_fails_closed(self):
        self.assert_denied("unknown_issuer", lambda: self.gate(provider=lambda b: allow_response(b, issuer="unknown")))

    def test_stale_policy_version_fails_closed(self):
        self.assert_denied("stale_policy", lambda: self.gate(provider=lambda b: allow_response(b, policy_version=b.policy.version - 1)))

    def test_action_binding_mismatch_fails_closed(self):
        self.assert_denied("action_binding_mismatch", lambda: self.gate(provider=lambda b: allow_response(b, execution_intent_digest="00" * 32)))

    def test_expired_decision_fails_closed(self):
        self.assert_denied(
            "expired_or_invalid_decision",
            lambda: self.gate(provider=lambda b: allow_response(b, expires_at=(NOW - timedelta(seconds=1)).isoformat())),
        )

    def test_expired_action_fails_closed(self):
        action = replace(base_action(), expiry=int(NOW.timestamp()))
        self.assert_denied("expired_action", lambda: self.gate(action=action))

    def test_replay_fails_closed(self):
        consumer = AtomicDecisionConsumer()
        self.gate(consumer=consumer)
        self.assert_denied("replayed_decision", lambda: self.gate(consumer=consumer))

    def test_action_mutation_after_allow_fails_closed(self):
        original = base_action()
        mutated = replace(original, amount=original.amount + 1)
        calls = iter([original, mutated])
        self.assert_denied(
            "action_mutation",
            lambda: authorize_before_delegated_signing(
                enabled=True,
                read_action=lambda: next(calls),
                read_wallet_policy=lambda: base_policy(),
                deterministic_policy_allows=lambda _a, _p: True,
                decision_provider=lambda b: allow_response(b),
                known_issuer="interai:test",
                consume_decision_id=AtomicDecisionConsumer().consume,
                now=lambda: NOW,
            ),
        )

    def test_policy_change_after_allow_fails_closed(self):
        original = base_policy()
        changed = replace(original, version=original.version + 1, policy_hash="0x" + "ef" * 32)
        policies = iter([original, changed])
        self.assert_denied(
            "stale_policy",
            lambda: authorize_before_delegated_signing(
                enabled=True,
                read_action=base_action,
                read_wallet_policy=lambda: next(policies),
                deterministic_policy_allows=lambda _a, _p: True,
                decision_provider=lambda b: allow_response(b),
                known_issuer="interai:test",
                consume_decision_id=AtomicDecisionConsumer().consume,
                now=lambda: NOW,
            ),
        )

    def test_allow_cannot_override_wallet_hard_denial(self):
        self.assert_denied("wallet_hard_denial", lambda: self.gate(policy_allows=lambda _a, _p: False))

    def test_second_deterministic_revalidation_can_veto_allow(self):
        checks = iter([True, False])
        self.assert_denied(
            "wallet_hard_denial",
            lambda: self.gate(policy_allows=lambda _a, _p: next(checks)),
        )

    def test_decision_expiring_during_final_wallet_check_fails_closed(self):
        clock = {"value": NOW}
        checks = {"count": 0}

        def policy_allows(_action, _policy):
            checks["count"] += 1
            if checks["count"] == 2:
                clock["value"] = NOW + timedelta(seconds=61)
            return True

        self.assert_denied(
            "expired_or_invalid_decision",
            lambda: self.gate(policy_allows=policy_allows, now=lambda: clock["value"]),
        )

    def test_action_expiring_during_final_wallet_check_fails_closed(self):
        action = replace(base_action(), expiry=int((NOW + timedelta(seconds=30)).timestamp()))
        clock = {"value": NOW}
        checks = {"count": 0}

        def policy_allows(_action, _policy):
            checks["count"] += 1
            if checks["count"] == 2:
                clock["value"] = NOW + timedelta(seconds=31)
            return True

        self.assert_denied(
            "expired_action",
            lambda: self.gate(action=action, policy_allows=policy_allows, now=lambda: clock["value"]),
        )

    def test_concurrent_replay_allows_exactly_one_call(self):
        consumer = AtomicDecisionConsumer()
        barrier = threading.Barrier(2)
        counts: dict[int, int] = {}
        counts_lock = threading.Lock()

        def policy_allows(_action, _policy):
            ident = threading.get_ident()
            with counts_lock:
                counts[ident] = counts.get(ident, 0) + 1
                call_number = counts[ident]
            if call_number == 2:
                barrier.wait(timeout=2)
            return True

        def attempt():
            try:
                result = self.gate(consumer=consumer, policy_allows=policy_allows)
                return result["status"]
            except AuthorizationDenied as exc:
                return str(exc)

        with ThreadPoolExecutor(max_workers=2) as executor:
            outcomes = list(executor.map(lambda _i: attempt(), range(2)))

        self.assertEqual(outcomes.count("allow"), 1)
        self.assertEqual(outcomes.count("replayed_decision"), 1)


if __name__ == "__main__":
    unittest.main()
