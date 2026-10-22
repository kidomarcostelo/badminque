"""Continuous K-factor decay and rating deviation dynamics.

Adheres strictly to docs/research/rating-algorithm-spec.md Section 3.5.
Pure Python standard library with zero external dependencies.
"""

import math

# Mathematical constants per rating-algorithm-spec.md Section 3.5
K_FACTOR_PROVISIONAL: float = 64.0
K_FACTOR_ESTABLISHED: float = 16.0
K_HALF_LIFE: float = 6.0
ESTABLISHED_MATCH_THRESHOLD: int = 8
PROVISIONAL_RD_THRESHOLD: float = 100.0
RD_INITIAL: float = 350.0
RD_MIN: float = 40.0
INACTIVITY_C: float = 25.0
INACTIVITY_GRACE_DAYS: int = 30
DAYS_PER_INACTIVITY_MONTH: float = 30.0


def calculate_k_factor(
    matches_played: int,
    k_max: float = K_FACTOR_PROVISIONAL,
    k_min: float = K_FACTOR_ESTABLISHED,
    half_life: float = K_HALF_LIFE,
) -> float:
    """Calculate the continuous dynamic K-factor based on player match experience.

    Mathematical formula (docs/research/rating-algorithm-spec.md Section 3.5.1):
        lambda = ln(2.0) / half_life
        K(N) = K_min + (K_max - K_min) * exp(-lambda * N)
    """
    if matches_played < 0:
        raise ValueError(f"matches_played must be non-negative, got {matches_played}")

    decay_constant = math.log(2.0) / half_life
    return k_min + (k_max - k_min) * math.exp(-decay_constant * matches_played)


def calculate_rd(
    matches_played: int,
    rd_initial: float = RD_INITIAL,
    rd_min: float = RD_MIN,
    half_life: float = K_HALF_LIFE,
) -> float:
    """Calculate rating deviation decay based on player match experience.

    Mathematical formula (docs/research/rating-algorithm-spec.md Section 3.5.2):
        lambda = ln(2.0) / half_life
        RD(N) = RD_min + (RD_0 - RD_min) * exp(-lambda * N)
    """
    if matches_played < 0:
        raise ValueError(f"matches_played must be non-negative, got {matches_played}")

    decay_constant = math.log(2.0) / half_life
    return rd_min + (rd_initial - rd_min) * math.exp(-decay_constant * matches_played)


def apply_inactivity_inflation(
    current_rd: float,
    days_inactive: int,
    inactivity_c: float = INACTIVITY_C,
    grace_days: int = INACTIVITY_GRACE_DAYS,
    rd_initial: float = RD_INITIAL,
) -> float:
    """Apply rating deviation inflation for player dormancy exceeding grace period.

    Mathematical formula (docs/research/rating-algorithm-spec.md Section 3.5.2):
        RD_active = min(RD_0, sqrt(RD^2 + c^2 * ((days_inactive - 30) / 30.0)))
    """
    if days_inactive < 0:
        raise ValueError(f"days_inactive must be non-negative, got {days_inactive}")
    if days_inactive <= grace_days:
        return current_rd

    months_over = (days_inactive - grace_days) / DAYS_PER_INACTIVITY_MONTH
    inflated_rd = math.sqrt(current_rd**2 + (inactivity_c**2) * months_over)
    return min(rd_initial, inflated_rd)


def is_provisional(
    matches_played: int,
    rd: float | None = None,
    match_threshold: int = ESTABLISHED_MATCH_THRESHOLD,
    rd_threshold: float = PROVISIONAL_RD_THRESHOLD,
    check_rd: bool = False,
) -> bool:
    """Determine whether a player rating is provisional or established.

    A player is considered provisional if they have played fewer than
    ESTABLISHED_MATCH_THRESHOLD matches (8) per AGENTS.md Invariant 5.
    If check_rd is True and rd is provided, player is also considered provisional
    if rd > PROVISIONAL_RD_THRESHOLD (100.0) per rating-algorithm-spec.md Section 3.1.
    """
    if matches_played < 0:
        raise ValueError(f"matches_played must be non-negative, got {matches_played}")
    if rd is not None:
        if not math.isfinite(rd):
            raise ValueError(f"rd must be a finite number, got {rd}")
        if rd < 0.0:
            raise ValueError(f"rd must be non-negative, got {rd}")
        if check_rd and rd > rd_threshold:
            return True
    return matches_played < match_threshold
