"""Rating invariants and domain integrity assertions.

Adheres strictly to AGENTS.md Invariant 3 and rating-algorithm-spec.md Section 7.
Pure Python standard library with zero external dependencies.
"""

import math


class NonInversionViolationError(ValueError):
    """Raised when a rating delta inverts the match outcome."""


RATING_FLOOR: float = 800.0


def enforce_rating_floor(
    rating: float,
    floor: float = RATING_FLOOR,
) -> float:
    """Clamp rating to the domain floor (800.0).

    Prevents negative ratings or discouraging entry-level beginners
    per rating-algorithm-spec.md Section 7.2.
    """
    if not math.isfinite(rating):
        raise ValueError(f"rating must be a finite number, got {rating}")
    return max(floor, rating)


def enforce_non_inversion(
    pre_rating: float,
    raw_post_rating: float,
    won_match: bool,
    floor: float = RATING_FLOOR,
) -> float:
    """Enforce the non-inversion invariant and rating floor on post-match rating.

    Mathematical Invariant:
        Winners never lose rating points: post_rating >= pre_rating
        Losers never gain rating points: post_rating <= pre_rating
        Absolute floor: post_rating >= 800.0
    """
    if not math.isfinite(pre_rating) or not math.isfinite(raw_post_rating):
        raise ValueError(
            f"Rating values must be finite numbers, got "
            f"pre={pre_rating}, raw_post={raw_post_rating}"
        )
    if won_match:
        # Winner post-rating cannot decrease below pre-rating
        return max(pre_rating, raw_post_rating)

    # Loser post-rating cannot increase above pre-rating, and cannot drop below floor
    clamped_loss = min(pre_rating, raw_post_rating)
    return max(floor, clamped_loss)


def assert_non_inversion(
    pre_rating: float,
    post_rating: float,
    won_match: bool,
    tolerance: float = 1e-7,
) -> None:
    """Verify that a rating update strictly respects the Non-Inversion Invariant.

    Raises NonInversionViolationError if a winner loses rating points or
    a loser gains rating points.
    """
    if not math.isfinite(pre_rating) or not math.isfinite(post_rating):
        raise ValueError(
            f"Rating values must be finite numbers, got "
            f"pre={pre_rating}, post={post_rating}"
        )
    delta = post_rating - pre_rating
    if won_match and delta < -tolerance:
        raise NonInversionViolationError(
            f"Winner rating decreased: pre={pre_rating}, post={post_rating}, "
            f"delta={delta} < 0"
        )
    if not won_match and delta > tolerance:
        raise NonInversionViolationError(
            f"Loser rating increased: pre={pre_rating}, post={post_rating}, "
            f"delta={delta} > 0"
        )
