"""Unit and property tests for Margin of Victory (MOV) multiplier and format weights.

Conforms to CODING_STANDARDS.md Section 1.5 (Colocated Tests).
"""

import pytest

from badminque_api.domain.rating.mov import (
    MAX_MOV_MULTIPLIER,
    MIN_MOV_MULTIPLIER,
    MatchFormat,
    calculate_margin_of_victory_multiplier,
    get_match_format_weight,
)


def test_mov_scenario_1_even_close_match() -> None:
    """Scenario 1: 21-19, delta_r=0 yields M ≈ 0.528 (damped for 2-point margin)."""
    # mov_eff = 2.0. ln(3)/ln(8) ≈ 1.0986 / 2.0794 ≈ 0.5283
    multiplier = calculate_margin_of_victory_multiplier(
        points_winner=21,
        points_loser=19,
        games_played=1,
        rating_diff_winner_minus_loser=0.0,
    )
    assert multiplier == pytest.approx(0.5283, abs=1e-3)


def test_mov_scenario_2_even_decisive_blowout() -> None:
    """Scenario 2: 21-5, delta_r=0 yields M ≈ 1.362 (amplified for blowout)."""
    # mov_eff = 16.0. ln(17)/ln(8) ≈ 2.8332 / 2.0794 ≈ 1.3625
    multiplier = calculate_margin_of_victory_multiplier(
        points_winner=21,
        points_loser=5,
        games_played=1,
        rating_diff_winner_minus_loser=0.0,
    )
    assert multiplier == pytest.approx(1.3625, abs=1e-3)


def test_mov_scenario_3_heavy_favorite_blowout_damped_to_min() -> None:
    """Scenario 3: 21-3, delta_r=+400 favorite blowout is clamped to MIN_MOV (0.50)."""
    multiplier = calculate_margin_of_victory_multiplier(
        points_winner=21,
        points_loser=3,
        games_played=1,
        rating_diff_winner_minus_loser=400.0,
    )
    assert multiplier == pytest.approx(MIN_MOV_MULTIPLIER, abs=1e-5)


def test_mov_scenario_4_underdog_upset() -> None:
    """Scenario 4: 21-18, delta_r=-400 underdog upset yields M ≈ 0.952."""
    multiplier = calculate_margin_of_victory_multiplier(
        points_winner=21,
        points_loser=18,
        games_played=1,
        rating_diff_winner_minus_loser=-400.0,
    )
    assert multiplier == pytest.approx(0.952, abs=1e-3)


def test_mov_close_30_28_clamped_to_min() -> None:
    """Close 30-28 match by a favorite yields ≈ 0.50 (clamped)."""
    # For a favorite (e.g. delta_r=100) winning 30-28, multiplier is clamped to 0.50
    multiplier = calculate_margin_of_victory_multiplier(
        points_winner=30,
        points_loser=28,
        games_played=1,
        rating_diff_winner_minus_loser=100.0,
    )
    assert multiplier == pytest.approx(MIN_MOV_MULTIPLIER, abs=1e-5)


def test_mov_blowout_30_8_clamped_to_max() -> None:
    """Blowout 30-8 match by underdog yields ≈ 1.75 (clamped to max)."""
    # Underdog (delta_r=-200) winning 30-8 blowout reaches max clamp 1.75
    multiplier = calculate_margin_of_victory_multiplier(
        points_winner=30,
        points_loser=8,
        games_played=1,
        rating_diff_winner_minus_loser=-200.0,
    )
    assert multiplier == pytest.approx(MAX_MOV_MULTIPLIER, abs=1e-5)


@pytest.mark.parametrize("games_played", [1, 2, 3])
def test_mov_bounds_invariant(games_played: int) -> None:
    """Verify MOV multiplier is strictly bounded between MIN_MOV and MAX_MOV."""
    for pts_lose in range(0, 30, 5):
        for delta_r in [-600.0, -200.0, 0.0, 200.0, 600.0]:
            multiplier = calculate_margin_of_victory_multiplier(
                points_winner=30,
                points_loser=pts_lose,
                games_played=games_played,
                rating_diff_winner_minus_loser=delta_r,
            )
            assert MIN_MOV_MULTIPLIER <= multiplier <= MAX_MOV_MULTIPLIER


def test_mov_invalid_inputs_raise() -> None:
    """Precondition violations raise ValueError with informative messages."""
    with pytest.raises(ValueError, match="games_played must be at least 1"):
        calculate_margin_of_victory_multiplier(
            21, 19, games_played=0, rating_diff_winner_minus_loser=0.0
        )

    with pytest.raises(ValueError, match="points_winner must be non-negative"):
        calculate_margin_of_victory_multiplier(
            -1, 21, games_played=1, rating_diff_winner_minus_loser=0.0
        )

    with pytest.raises(ValueError, match="points_loser must be non-negative"):
        calculate_margin_of_victory_multiplier(
            21, -1, games_played=1, rating_diff_winner_minus_loser=0.0
        )


def test_mov_winner_fewer_aggregate_points() -> None:
    """When match winner has fewer aggregate points (e.g. 47 vs 59 in Best-of-3),
    MOV_eff defaults to 1.0 per Section 3.4.1 and clamps to MIN_MOV_MULTIPLIER (0.50).
    """
    multiplier = calculate_margin_of_victory_multiplier(
        points_winner=47,
        points_loser=59,
        games_played=3,
        rating_diff_winner_minus_loser=0.0,
    )
    # effective_mov = max(1.0, -12/3) = 1.0
    # log_factor = ln(2.0) / ln(8.0) = 1/3 ≈ 0.3333
    # clamped to MIN_MOV_MULTIPLIER = 0.50
    assert multiplier == pytest.approx(MIN_MOV_MULTIPLIER, abs=1e-5)

    with pytest.raises(ValueError, match="rating_diff must be a finite number"):
        calculate_margin_of_victory_multiplier(
            21, 19, games_played=1, rating_diff_winner_minus_loser=float("nan")
        )

    with pytest.raises(ValueError, match="min_multiplier must be positive"):
        calculate_margin_of_victory_multiplier(
            21,
            19,
            games_played=1,
            rating_diff_winner_minus_loser=0.0,
            min_multiplier=0.0,
        )

    with pytest.raises(ValueError, match="favorite_damping must be non-negative"):
        calculate_margin_of_victory_multiplier(
            21,
            19,
            games_played=1,
            rating_diff_winner_minus_loser=0.0,
            favorite_damping=-0.1,
        )


def test_match_format_weights() -> None:
    """Format weight returns 1.25 for BEST_OF_3 and 1.00 for single sets."""
    assert get_match_format_weight(MatchFormat.BEST_OF_3) == 1.25
    assert get_match_format_weight(MatchFormat.SINGLE_21) == 1.00
    assert get_match_format_weight(MatchFormat.SINGLE_30) == 1.00
