from __future__ import annotations

import hashlib
import json
import threading
from dataclasses import dataclass
from datetime import datetime, timezone
from typing import Any, Callable, Mapping


class AuthorizationDenied(RuntimeError):
    """Raised when the proposed delegated action must not proceed to signing."""


@dataclass(frozen=True)
class DelegatedAction:
    chain_id: int
    wallet: str
    delegate: str
    target: str
    calldata_hash: str
    token: str
    amount: int
    nonce: int
    expiry: int


@dataclass(frozen=True)
class WalletPolicySnapshot:
    version: int
    policy_hash: str


@dataclass(frozen=True)
class DecisionBinding:
    action: DelegatedAction
    policy: WalletPolicySnapshot


class AtomicDecisionConsumer:
    """Thread-safe in-memory single-use consumer for the mock adapter.

    Production integrations need a durable shared atomic store across workers
    and process restarts.
    """

    def __init__(self) -> None:
        self._consumed: set[str] = set()
        self._lock = threading.Lock()

    def consume(self, decision_id: str) -> bool:
        with self._lock:
            if decision_id in self._consumed:
                return False
            self._consumed.add(decision_id)
            return True


def _canonical_json(value: Mapping[str, Any]) -> str:
    return json.dumps(value, sort_keys=True, separators=(",", ":"), ensure_ascii=False)


def binding_payload(binding: DecisionBinding) -> dict[str, Any]:
    action = binding.action
    return {
        "schema": "interai-agent-bounties-binding/v1",
        "chain_id": action.chain_id,
        "wallet": action.wallet.lower(),
        "caller_delegate": action.delegate.lower(),
        "target": action.target.lower(),
        "calldata_hash": action.calldata_hash.lower(),
        "token": action.token.lower(),
        "amount": action.amount,
        "nonce": action.nonce,
        "expiry": action.expiry,
        "policy_version": binding.policy.version,
        "policy_hash": binding.policy.policy_hash.lower(),
    }


def binding_digest(binding: DecisionBinding) -> str:
    encoded = _canonical_json(binding_payload(binding)).encode("utf-8")
    return hashlib.sha256(encoded).hexdigest()


def _parse_iso8601(value: Any, field: str) -> datetime:
    if not isinstance(value, str) or not value:
        raise AuthorizationDenied(f"malformed_response:{field}")
    normalized = value[:-1] + "+00:00" if value.endswith("Z") else value
    try:
        parsed = datetime.fromisoformat(normalized)
    except ValueError as exc:
        raise AuthorizationDenied(f"malformed_response:{field}") from exc
    if parsed.tzinfo is None:
        raise AuthorizationDenied(f"malformed_response:{field}")
    return parsed.astimezone(timezone.utc)


def _normalize_decision(payload: Mapping[str, Any]) -> str:
    decision = payload.get("decision")
    if decision not in {"allow", "review_required", "block"}:
        raise AuthorizationDenied("malformed_response:decision")
    return str(decision)


def _utc_now(now: Callable[[], datetime]) -> datetime:
    current = now()
    if current.tzinfo is None:
        raise AuthorizationDenied("invalid_host_clock")
    return current.astimezone(timezone.utc)


def _action_not_expired(action: DelegatedAction, current_time: datetime) -> None:
    if action.expiry <= int(current_time.timestamp()):
        raise AuthorizationDenied("expired_action")


def authorize_before_delegated_signing(
    *,
    enabled: bool,
    read_action: Callable[[], DelegatedAction],
    read_wallet_policy: Callable[[], WalletPolicySnapshot],
    deterministic_policy_allows: Callable[[DelegatedAction, WalletPolicySnapshot], bool],
    decision_provider: Callable[[DecisionBinding], Mapping[str, Any]],
    known_issuer: str,
    consume_decision_id: Callable[[str], bool],
    now: Callable[[], datetime] = lambda: datetime.now(timezone.utc),
) -> Mapping[str, Any]:
    """Gate delegated signing without changing BoundedAgentWallet authority.

    The host remains responsible for deterministic wallet enforcement and signing.
    This adapter only adds a fail-closed contextual gate immediately before signing.

    `known_issuer` is only an identity label for this trusted mock provider. A
    future remote provider must authenticate response provenance separately.
    """

    if not enabled:
        return {"status": "baseline_disabled", "may_proceed_to_signing": True}

    initial_action = read_action()
    initial_policy = read_wallet_policy()
    initial_time = _utc_now(now)
    _action_not_expired(initial_action, initial_time)

    if not deterministic_policy_allows(initial_action, initial_policy):
        raise AuthorizationDenied("wallet_hard_denial")

    binding = DecisionBinding(action=initial_action, policy=initial_policy)

    try:
        response = decision_provider(binding)
    except TimeoutError as exc:
        raise AuthorizationDenied("oracle_timeout") from exc
    except Exception as exc:
        raise AuthorizationDenied("oracle_failure") from exc

    if not isinstance(response, Mapping):
        raise AuthorizationDenied("malformed_response:object")

    decision = _normalize_decision(response)
    if decision == "block":
        raise AuthorizationDenied("interai_block")
    if decision == "review_required":
        raise AuthorizationDenied("review_required")

    issuer = response.get("issuer")
    if issuer != known_issuer:
        raise AuthorizationDenied("unknown_issuer")

    decision_id = response.get("decision_id")
    if not isinstance(decision_id, str) or not decision_id:
        raise AuthorizationDenied("malformed_response:decision_id")

    expected_digest = binding_digest(binding)
    if response.get("execution_intent_digest") != expected_digest:
        raise AuthorizationDenied("action_binding_mismatch")

    if response.get("policy_version") != initial_policy.version:
        raise AuthorizationDenied("stale_policy")
    if str(response.get("policy_hash", "")).lower() != initial_policy.policy_hash.lower():
        raise AuthorizationDenied("stale_policy")

    issued_at = _parse_iso8601(response.get("issued_at"), "issued_at")
    expires_at = _parse_iso8601(response.get("expires_at"), "expires_at")
    current_time = _utc_now(now)
    if issued_at > current_time or expires_at <= current_time or expires_at <= issued_at:
        raise AuthorizationDenied("expired_or_invalid_decision")

    final_action = read_action()
    final_policy = read_wallet_policy()
    if final_action != initial_action:
        raise AuthorizationDenied("action_mutation")
    if final_policy != initial_policy:
        raise AuthorizationDenied("stale_policy")
    if not deterministic_policy_allows(final_action, final_policy):
        raise AuthorizationDenied("wallet_hard_denial")

    # Final handoff check: decision and action must still be live after the
    # terminal wallet-policy validation, immediately before single-use consume.
    handoff_time = _utc_now(now)
    if expires_at <= handoff_time:
        raise AuthorizationDenied("expired_or_invalid_decision")
    _action_not_expired(final_action, handoff_time)

    # The consume operation must be atomic. A separate "contains then add" is
    # race-prone and can authorize the same decision concurrently.
    if not consume_decision_id(decision_id):
        raise AuthorizationDenied("replayed_decision")

    return {
        "status": "allow",
        "decision_id": decision_id,
        "execution_intent_digest": expected_digest,
        "may_proceed_to_signing": True,
    }
