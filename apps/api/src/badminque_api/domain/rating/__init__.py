"""Domain rating engine module for Badminque.

Pure Python rating calculation and invariant enforcement.
"""

from badminque_api.domain.rating.engine import (
    INITIAL_RATING_BASELINE,
    MIN_POINTS_FOR_RATING,
    BadminqueRatingEngine,
    Discipline,
    PlayerProfileState,
    PlayerRatingState,
    RatingDeltaResult,
    RatingMatchInput,
    apply_retirement_forfeiture,
    calculate_doubles_rating_update,
    calculate_singles_rating_update,
)
from badminque_api.domain.rating.invariants import (
    RATING_FLOOR,
    NonInversionViolationError,
    assert_non_inversion,
    enforce_non_inversion,
    enforce_rating_floor,
)
from badminque_api.domain.rating.k_decay import (
    ESTABLISHED_MATCH_THRESHOLD,
    K_FACTOR_ESTABLISHED,
    K_FACTOR_PROVISIONAL,
    K_HALF_LIFE,
    PROVISIONAL_RD_THRESHOLD,
    RD_INITIAL,
    RD_MIN,
    apply_inactivity_inflation,
    calculate_k_factor,
    calculate_rd,
    is_provisional,
)
from badminque_api.domain.rating.mov import (
    FAVORITE_DAMPING,
    MAX_MOV_MULTIPLIER,
    MIN_MOV_MULTIPLIER,
    MatchFormat,
    calculate_margin_of_victory_multiplier,
    get_match_format_weight,
)
from badminque_api.domain.rating.soft_mean import (
    WEAK_LINK_GAMMA,
    calculate_expected_win_probability,
    calculate_weak_link_soft_mean,
)

__all__ = [
    "ESTABLISHED_MATCH_THRESHOLD",
    "FAVORITE_DAMPING",
    "INITIAL_RATING_BASELINE",
    "K_FACTOR_ESTABLISHED",
    "K_FACTOR_PROVISIONAL",
    "K_HALF_LIFE",
    "MAX_MOV_MULTIPLIER",
    "MIN_MOV_MULTIPLIER",
    "MIN_POINTS_FOR_RATING",
    "PROVISIONAL_RD_THRESHOLD",
    "RATING_FLOOR",
    "RD_INITIAL",
    "RD_MIN",
    "WEAK_LINK_GAMMA",
    "BadminqueRatingEngine",
    "Discipline",
    "MatchFormat",
    "NonInversionViolationError",
    "PlayerProfileState",
    "PlayerRatingState",
    "RatingDeltaResult",
    "RatingMatchInput",
    "apply_inactivity_inflation",
    "apply_retirement_forfeiture",
    "assert_non_inversion",
    "calculate_doubles_rating_update",
    "calculate_expected_win_probability",
    "calculate_k_factor",
    "calculate_margin_of_victory_multiplier",
    "calculate_rd",
    "calculate_singles_rating_update",
    "calculate_weak_link_soft_mean",
    "enforce_non_inversion",
    "enforce_rating_floor",
    "get_match_format_weight",
    "is_provisional",
]
