"""Margin of victory (MOV) multiplier with logarithmic favorite-damping.

Adheres strictly to docs/research/rating-algorithm-spec.md Section 3.4.
Pure Python standard library with zero external dependencies.
"""

import math
from enum import Enum

# Mathematical constants per rating-algorithm-spec.md Section 3.4
MIN_MOV_MULTIPLIER: float = 0.50
MAX_MOV_MULTIPLIER: float = 1.75
FAVORITE_DAMPING: float = 0.50
MOV_DENOMINATOR_BASE: float = 8.0  # ln(7 + 1.0) ≈ 2.07944
ELO_LOGISTIC_SCALE: float = 400.0
FORMAT_WEIGHT_SINGLE: float = 1.00
FORMAT_WEIGHT_BEST_OF_3: float = 1.25


class MatchFormat(str, Enum):
    """Supported match scoring formats in Badminque."""

    SINGLE_21 = "SINGLE_21"
    BEST_OF_3 = "BEST_OF_3"
    SINGLE_30 = "SINGLE_30"


def get_match_format_weight(match_format: MatchFormat) -> float:
    """Return the multiplier weight corresponding to the match format.

    Mathematical formula (docs/research/rating-algorithm-spec.md Section 3.4.3):
        W_format = 1.25 for BEST_OF_3, 1.00 for single-game formats.
    """
    if match_format == MatchFormat.BEST_OF_3:
        return FORMAT_WEIGHT_BEST_OF_3
    return FORMAT_WEIGHT_SINGLE


def calculate_margin_of_victory_multiplier(
    points_winner: int,
    points_loser: int,
    games_played: int,
    rating_diff_winner_minus_loser: float,
    favorite_damping: float = FAVORITE_DAMPING,
    min_multiplier: float = MIN_MOV_MULTIPLIER,
    max_multiplier: float = MAX_MOV_MULTIPLIER,
) -> float:
    """Calculate the bounded logarithmic Margin of Victory (MOV) multiplier.

    Mathematical formula (docs/research/rating-algorithm-spec.md Section 3.4):
        MOV_eff = max(1.0, (P_win - P_lose) / G)
        damping = (1.0 + delta) / (1.0 + delta * 10 ** (delta_R / 400.0))
        M = clamp((ln(MOV_eff + 1.0) / ln(8.0)) * damping, M_min, M_max)
    """
    if games_played < 1:
        raise ValueError(f"games_played must be at least 1, got {games_played}")
    if points_loser < 0:
        raise ValueError(f"points_loser must be non-negative, got {points_loser}")
    if points_winner < 0:
        raise ValueError(f"points_winner must be non-negative, got {points_winner}")
    if not math.isfinite(rating_diff_winner_minus_loser):
        raise ValueError(
            f"rating_diff must be a finite number, got {rating_diff_winner_minus_loser}"
        )
    if min_multiplier <= 0.0 or max_multiplier <= min_multiplier:
        raise ValueError(
            f"min_multiplier must be positive and less than max_multiplier, "
            f"got min={min_multiplier}, max={max_multiplier}"
        )
    if favorite_damping < 0.0:
        raise ValueError(
            f"favorite_damping must be non-negative, got {favorite_damping}"
        )

    points_differential = points_winner - points_loser
    effective_mov = max(1.0, float(points_differential) / float(games_played))

    log_factor = math.log(effective_mov + 1.0) / math.log(MOV_DENOMINATOR_BASE)
    rating_exponent = rating_diff_winner_minus_loser / ELO_LOGISTIC_SCALE
    damping_factor = (1.0 + favorite_damping) / (
        1.0 + favorite_damping * (10.0**rating_exponent)
    )

    raw_multiplier = log_factor * damping_factor
    return max(min_multiplier, min(max_multiplier, raw_multiplier))
