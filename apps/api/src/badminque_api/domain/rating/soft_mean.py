"""Weak-link soft mean doubles team rating and win probability.

Adheres strictly to docs/research/rating-algorithm-spec.md Section 3.3.
Pure Python standard library with zero external dependencies.
"""

import math

# Mathematical constants per rating-algorithm-spec.md Section 3.3.2
WEAK_LINK_GAMMA: float = 0.08
ELO_LOGISTIC_SCALE: float = 400.0


def calculate_weak_link_soft_mean(
    rating_1: float,
    rating_2: float,
    gamma: float = WEAK_LINK_GAMMA,
) -> float:
    """Calculate effective doubles team rating using weak-link soft mean.

    Mathematical formula (docs/research/rating-algorithm-spec.md Section 3.3.2):
        R_high = max(R_1, R_2)
        R_low = min(R_1, R_2)
        R_team = (R_1 + R_2) / 2 - gamma * (R_high - R_low)
               = (0.5 - gamma) * R_high + (0.5 + gamma) * R_low

    With gamma = 0.08:
        R_team = 0.42 * R_high + 0.58 * R_low
    Assigning 58% weight to the weaker partner and 42% to the stronger partner.
    """
    if not math.isfinite(rating_1) or not math.isfinite(rating_2):
        raise ValueError(
            f"Rating values must be finite numbers, got ({rating_1}, {rating_2})"
        )
    if gamma < 0.0 or gamma >= 0.5:
        raise ValueError(f"gamma must satisfy 0.0 <= gamma < 0.5, got {gamma}")

    higher_rating = max(rating_1, rating_2)
    lower_rating = min(rating_1, rating_2)
    return 0.5 * (rating_1 + rating_2) - gamma * (higher_rating - lower_rating)


def calculate_expected_win_probability(
    player_rating: float,
    opponent_rating: float,
    logistic_scale: float = ELO_LOGISTIC_SCALE,
) -> float:
    """Calculate expected win probability under the standard logistic model.

    Mathematical formula (docs/research/rating-algorithm-spec.md Section 3.3.3):
        E = 1.0 / (1.0 + 10.0 ** ((opponent_rating - player_rating) / 400.0))
    """
    if not math.isfinite(player_rating) or not math.isfinite(opponent_rating):
        raise ValueError(
            f"Rating values must be finite numbers, got "
            f"({player_rating}, {opponent_rating})"
        )

    exponent = (opponent_rating - player_rating) / logistic_scale
    return 1.0 / (1.0 + 10.0**exponent)
