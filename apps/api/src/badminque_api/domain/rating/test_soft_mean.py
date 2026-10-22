"""Unit and property tests for weak-link soft mean and expected win probability.

Conforms to CODING_STANDARDS.md Section 1.5 (Colocated Tests).
"""

import pytest

from badminque_api.domain.rating.soft_mean import (
    calculate_expected_win_probability,
    calculate_weak_link_soft_mean,
)


def test_soft_mean_equal_ratings() -> None:
    """When partners have identical ratings, team rating equals individual rating."""
    assert calculate_weak_link_soft_mean(1500.0, 1500.0) == 1500.0
    assert calculate_weak_link_soft_mean(2000.0, 2000.0) == 2000.0


def test_soft_mean_scenario_5_unbalanced_pair() -> None:
    """Scenario 5: 1800 + 1200 pair yields effective team rating of 1452.0."""
    # (1800 + 1200)/2 - 0.08 * 600 = 1500 - 48 = 1452.0
    team_rating = calculate_weak_link_soft_mean(1800.0, 1200.0)
    assert team_rating == pytest.approx(1452.0, abs=1e-5)


@pytest.mark.parametrize(
    ("r_high", "r_low"),
    [
        (1500.0, 1500.0),
        (1600.0, 1500.0),
        (1800.0, 1400.0),
        (2000.0, 1200.0),
        (2500.0, 1000.0),
    ],
)
def test_soft_mean_58_42_weighting_across_differentials(
    r_high: float, r_low: float
) -> None:
    """Verify weak-link soft mean gives exactly 58% weight to the weaker partner."""
    expected_weighted = 0.42 * r_high + 0.58 * r_low
    actual = calculate_weak_link_soft_mean(r_high, r_low)
    assert actual == pytest.approx(expected_weighted, abs=1e-9)


def test_soft_mean_symmetry() -> None:
    """Partner order in arguments must produce identical effective team rating."""
    team_ab = calculate_weak_link_soft_mean(1900.0, 1300.0)
    team_ba = calculate_weak_link_soft_mean(1300.0, 1900.0)
    assert team_ab == team_ba


@pytest.mark.parametrize("shift", [-500.0, -100.0, 0.0, 250.0, 1000.0])
def test_soft_mean_affine_invariance(shift: float) -> None:
    """Shifting both ratings by a constant shifts team rating by the same amount."""
    r1, r2 = 1700.0, 1350.0
    base_team = calculate_weak_link_soft_mean(r1, r2)
    shifted_team = calculate_weak_link_soft_mean(r1 + shift, r2 + shift)
    assert shifted_team == pytest.approx(base_team + shift, abs=1e-9)


def test_soft_mean_strict_monotonicity() -> None:
    """Increasing either player's rating strictly increases effective team rating."""
    base_team = calculate_weak_link_soft_mean(1500.0, 1500.0)
    higher_r1 = calculate_weak_link_soft_mean(1550.0, 1500.0)
    higher_r2 = calculate_weak_link_soft_mean(1500.0, 1550.0)
    assert higher_r1 > base_team
    assert higher_r2 > base_team


def test_soft_mean_invalid_ratings_raise() -> None:
    """NaN or infinite values raise ValueError."""
    with pytest.raises(ValueError, match="Rating values must be finite"):
        calculate_weak_link_soft_mean(float("nan"), 1500.0)
    with pytest.raises(ValueError, match="Rating values must be finite"):
        calculate_weak_link_soft_mean(1500.0, float("inf"))


def test_soft_mean_invalid_gamma_raises() -> None:
    """Gamma outside [0, 0.5) raises ValueError."""
    with pytest.raises(ValueError, match="gamma must satisfy 0.0 <= gamma < 0.5"):
        calculate_weak_link_soft_mean(1500.0, 1500.0, gamma=-0.01)
    with pytest.raises(ValueError, match="gamma must satisfy 0.0 <= gamma < 0.5"):
        calculate_weak_link_soft_mean(1500.0, 1500.0, gamma=0.5)


def test_expected_win_probability_equal() -> None:
    """Equally rated players have a 50% win probability."""
    assert calculate_expected_win_probability(1500.0, 1500.0) == pytest.approx(0.5)


def test_expected_win_probability_scenarios() -> None:
    """Verify standard Elo expectations: 400 pt favorite has ~90.9% win probability."""
    prob_favorite = calculate_expected_win_probability(1800.0, 1400.0)
    prob_underdog = calculate_expected_win_probability(1400.0, 1800.0)
    assert prob_favorite == pytest.approx(0.9090909, abs=1e-5)
    assert prob_underdog == pytest.approx(0.0909091, abs=1e-5)
    assert prob_favorite + prob_underdog == pytest.approx(1.0, abs=1e-9)


def test_expected_win_probability_invalid_ratings_raise() -> None:
    """NaN or infinite values raise ValueError."""
    with pytest.raises(ValueError, match="Rating values must be finite"):
        calculate_expected_win_probability(float("nan"), 1500.0)
    with pytest.raises(ValueError, match="Rating values must be finite"):
        calculate_expected_win_probability(1500.0, float("-inf"))
