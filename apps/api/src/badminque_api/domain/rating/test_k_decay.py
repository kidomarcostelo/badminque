"""Unit and property tests for continuous K-factor decay and rating deviation.

Conforms to CODING_STANDARDS.md Section 1.5 (Colocated Tests).
"""

import math

import pytest

from badminque_api.domain.rating.k_decay import (
    ESTABLISHED_MATCH_THRESHOLD,
    K_FACTOR_ESTABLISHED,
    K_FACTOR_PROVISIONAL,
    K_HALF_LIFE,
    RD_INITIAL,
    RD_MIN,
    apply_inactivity_inflation,
    calculate_k_factor,
    calculate_rd,
    is_provisional,
)


def test_calculate_k_factor_zero_matches() -> None:
    """A new player with zero matches played receives provisional K-factor (64.0)."""
    assert calculate_k_factor(0) == pytest.approx(K_FACTOR_PROVISIONAL, abs=1e-5)


def test_calculate_k_factor_half_life() -> None:
    """At half-life (6 matches), K-factor drops halfway between 64 and 16 (40.0)."""
    expected_midpoint = (
        K_FACTOR_ESTABLISHED + (K_FACTOR_PROVISIONAL - K_FACTOR_ESTABLISHED) * 0.5
    )
    assert calculate_k_factor(int(K_HALF_LIFE)) == pytest.approx(
        expected_midpoint, abs=1e-5
    )


def test_calculate_k_factor_decay_progression() -> None:
    """Verifies K-factor decays monotonically as matches increase from 0 to 8+."""
    previous_k = calculate_k_factor(0)
    for match_count in range(1, 20):
        current_k = calculate_k_factor(match_count)
        assert current_k < previous_k, (
            f"K did not decrease at match_count={match_count}"
        )
        assert current_k >= K_FACTOR_ESTABLISHED
        previous_k = current_k


def test_calculate_k_factor_asymptotic_convergence() -> None:
    """With very high match count, K-factor converges to veteran floor (16.0)."""
    assert calculate_k_factor(120) == pytest.approx(K_FACTOR_ESTABLISHED, abs=1e-4)


def test_calculate_k_factor_negative_matches_raises() -> None:
    """Negative match count violates preconditions and raises ValueError."""
    with pytest.raises(ValueError, match="matches_played must be non-negative"):
        calculate_k_factor(-1)


def test_calculate_rd_zero_matches() -> None:
    """Initial rating deviation for unrated player is RD_INITIAL (350.0)."""
    assert calculate_rd(0) == pytest.approx(RD_INITIAL, abs=1e-5)


def test_calculate_rd_half_life() -> None:
    """At 6 matches, RD drops halfway between 350 and 40 (195.0)."""
    expected_rd = RD_MIN + (RD_INITIAL - RD_MIN) * 0.5
    assert calculate_rd(6) == pytest.approx(expected_rd, abs=1e-5)


def test_calculate_rd_negative_matches_raises() -> None:
    """Negative match count raises ValueError."""
    with pytest.raises(ValueError, match="matches_played must be non-negative"):
        calculate_rd(-1)


def test_apply_inactivity_within_grace_period() -> None:
    """Within 30 days grace period, RD remains unchanged."""
    rd = 120.0
    assert apply_inactivity_inflation(rd, days_inactive=0) == rd
    assert apply_inactivity_inflation(rd, days_inactive=30) == rd


def test_apply_inactivity_inflation_over_grace_period() -> None:
    """After 30 days, RD inflates based on time elapsed without exceeding RD_INITIAL."""
    rd = 80.0
    inflated_60_days = apply_inactivity_inflation(rd, days_inactive=60)
    # 30 days past grace = 1 month. sqrt(80^2 + 25^2 * 1) = sqrt(7025) ≈ 83.815
    expected = math.sqrt(80.0**2 + 25.0**2 * 1.0)
    assert inflated_60_days == pytest.approx(expected, abs=1e-3)
    assert inflated_60_days > rd

    # Inactivity cannot exceed RD_INITIAL (350.0)
    inflated_huge = apply_inactivity_inflation(rd, days_inactive=10000)
    assert inflated_huge == RD_INITIAL


def test_apply_inactivity_negative_days_raises() -> None:
    """Negative days inactive raises ValueError."""
    with pytest.raises(ValueError, match="days_inactive must be non-negative"):
        apply_inactivity_inflation(100.0, days_inactive=-5)


def test_is_provisional() -> None:
    """Matches below threshold (8) are provisional, 8 or more are established."""
    assert is_provisional(matches_played=0) is True
    assert is_provisional(matches_played=7) is True
    assert is_provisional(matches_played=ESTABLISHED_MATCH_THRESHOLD) is False
    assert is_provisional(matches_played=15) is False

    # With check_rd=True:
    assert is_provisional(matches_played=10, rd=120.0, check_rd=True) is True
    assert is_provisional(matches_played=10, rd=80.0, check_rd=True) is False
    assert is_provisional(matches_played=10, rd=120.0, check_rd=False) is False


def test_is_provisional_negative_raises() -> None:
    """Negative matches played or invalid rd raises ValueError."""
    with pytest.raises(ValueError, match="matches_played must be non-negative"):
        is_provisional(matches_played=-1)
    with pytest.raises(ValueError, match="rd must be a finite number"):
        is_provisional(matches_played=5, rd=float("nan"))
    with pytest.raises(ValueError, match="rd must be non-negative"):
        is_provisional(matches_played=5, rd=-10.0)
