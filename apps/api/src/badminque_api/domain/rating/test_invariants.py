"""Property-based invariant test suite for the Non-Inversion Invariant.

Verifies the Non-Inversion Invariant across 10,000 random rating and score combinations.
Conforms to CODING_STANDARDS.md Section 1.5 (Colocated Tests) and AGENTS.md Invariant 3.
"""

import pytest
from hypothesis import given, settings
from hypothesis import strategies as st

from badminque_api.domain.rating.engine import (
    PlayerRatingState,
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
from badminque_api.domain.rating.mov import MatchFormat


def test_assert_non_inversion_valid() -> None:
    """Non-inversion passes when winner gains or ties and loser loses or ties."""
    assert_non_inversion(pre_rating=1500.0, post_rating=1510.0, won_match=True)
    assert_non_inversion(pre_rating=1500.0, post_rating=1500.0, won_match=True)
    assert_non_inversion(pre_rating=1500.0, post_rating=1490.0, won_match=False)
    assert_non_inversion(pre_rating=1500.0, post_rating=1500.0, won_match=False)


def test_assert_non_inversion_winner_drops_raises() -> None:
    """NonInversionViolationError raised when winner loses rating."""
    with pytest.raises(NonInversionViolationError, match="Winner rating decreased"):
        assert_non_inversion(pre_rating=1500.0, post_rating=1499.0, won_match=True)


def test_assert_non_inversion_loser_gains_raises() -> None:
    """NonInversionViolationError raised when loser gains rating."""
    with pytest.raises(NonInversionViolationError, match="Loser rating increased"):
        assert_non_inversion(pre_rating=1500.0, post_rating=1501.0, won_match=False)


def test_enforce_rating_floor() -> None:
    """Rating floor clamps any rating below 800.0 to 800.0."""
    assert enforce_rating_floor(750.0) == RATING_FLOOR
    assert enforce_rating_floor(800.0) == RATING_FLOOR
    assert enforce_rating_floor(1200.0) == 1200.0


def test_invariants_non_finite_inputs_raise() -> None:
    """Non-finite inputs to invariant functions raise ValueError."""
    with pytest.raises(ValueError, match="rating must be a finite number"):
        enforce_rating_floor(float("nan"))
    with pytest.raises(ValueError, match="Rating values must be finite"):
        enforce_non_inversion(float("inf"), 1500.0, won_match=True)
    with pytest.raises(ValueError, match="Rating values must be finite"):
        assert_non_inversion(1500.0, float("nan"), won_match=True)


def test_enforce_non_inversion_mechanics() -> None:
    """enforce_non_inversion prevents winners from dropping and losers from gaining."""
    # Winner who had negative raw delta is restored to pre_rating
    assert (
        enforce_non_inversion(pre_rating=1500.0, raw_post_rating=1490.0, won_match=True)
        == 1500.0
    )
    # Winner who had positive delta keeps it
    assert (
        enforce_non_inversion(pre_rating=1500.0, raw_post_rating=1520.0, won_match=True)
        == 1520.0
    )

    # Loser who had positive raw delta is restored to pre_rating
    assert (
        enforce_non_inversion(
            pre_rating=1500.0, raw_post_rating=1510.0, won_match=False
        )
        == 1500.0
    )
    # Loser who had negative delta keeps it
    assert (
        enforce_non_inversion(
            pre_rating=1500.0, raw_post_rating=1480.0, won_match=False
        )
        == 1480.0
    )
    # Loser whose loss drops below floor is clamped to floor
    assert (
        enforce_non_inversion(pre_rating=820.0, raw_post_rating=790.0, won_match=False)
        == RATING_FLOOR
    )


# -----------------------------------------------------------------------------
# Property-Based Testing Suite (10,000 iterations)
# -----------------------------------------------------------------------------

# Strategy generating plausible player ratings [800.0, 3000.0]
st_rating = st.floats(
    min_value=800.0, max_value=3000.0, allow_nan=False, allow_infinity=False
)
# Strategy generating match count [0, 200]
st_matches = st.integers(min_value=0, max_value=200)
# Strategy generating game scores (0 to 30) ensuring no tie and at least 11 total points
st_set_score = st.tuples(
    st.integers(min_value=0, max_value=30),
    st.integers(min_value=0, max_value=30),
).filter(lambda s: s[0] != s[1] and (s[0] + s[1]) >= 11)
# Strategy for match format
st_format = st.sampled_from(
    [MatchFormat.SINGLE_21, MatchFormat.BEST_OF_3, MatchFormat.SINGLE_30]
)


@settings(max_examples=10000, deadline=None)
@given(
    r_a1=st_rating,
    r_a2=st_rating,
    r_b1=st_rating,
    r_b2=st_rating,
    m_a1=st_matches,
    m_a2=st_matches,
    m_b1=st_matches,
    m_b2=st_matches,
    set_score=st_set_score,
    fmt=st_format,
)
def test_hypothesis_doubles_non_inversion_invariant_10k(
    r_a1: float,
    r_a2: float,
    r_b1: float,
    r_b2: float,
    m_a1: int,
    m_a2: int,
    m_b1: int,
    m_b2: int,
    set_score: tuple[int, int],
    fmt: MatchFormat,
) -> None:
    """Hypothesis: 10,000 random doubles matches uphold Non-Inversion Invariant."""
    p_a1 = PlayerRatingState(player_id="a1", rating=r_a1, matches_played=m_a1)
    p_a2 = PlayerRatingState(player_id="a2", rating=r_a2, matches_played=m_a2)
    p_b1 = PlayerRatingState(player_id="b1", rating=r_b1, matches_played=m_b1)
    p_b2 = PlayerRatingState(player_id="b2", rating=r_b2, matches_played=m_b2)

    (res_a1, res_a2), (res_b1, res_b2) = calculate_doubles_rating_update(
        team_a=(p_a1, p_a2),
        team_b=(p_b1, p_b2),
        sets_scores=[set_score],
        match_format=fmt,
    )

    team_a_won = set_score[0] > set_score[1]

    if team_a_won:
        # Team A won: deltas must be >= 0
        assert res_a1.rating_delta >= 0.0
        assert res_a1.post_rating >= res_a1.pre_rating
        assert res_a2.rating_delta >= 0.0
        assert res_a2.post_rating >= res_a2.pre_rating

        # Team B lost: deltas must be <= 0
        assert res_b1.rating_delta <= 0.0
        assert res_b1.post_rating <= res_b1.pre_rating
        assert res_b2.rating_delta <= 0.0
        assert res_b2.post_rating <= res_b2.pre_rating
    else:
        # Team B won: deltas must be >= 0
        assert res_b1.rating_delta >= 0.0
        assert res_b1.post_rating >= res_b1.pre_rating
        assert res_b2.rating_delta >= 0.0
        assert res_b2.post_rating >= res_b2.pre_rating

        # Team A lost: deltas must be <= 0
        assert res_a1.rating_delta <= 0.0
        assert res_a1.post_rating <= res_a1.pre_rating
        assert res_a2.rating_delta <= 0.0
        assert res_a2.post_rating <= res_a2.pre_rating

    # Absolute floor: all ratings must stay >= 800.0
    for r in [res_a1, res_a2, res_b1, res_b2]:
        assert r.post_rating >= RATING_FLOOR


@settings(max_examples=1000, deadline=None)
@given(
    r_a=st_rating,
    r_b=st_rating,
    m_a=st_matches,
    m_b=st_matches,
    set_score=st_set_score,
    fmt=st_format,
)
def test_hypothesis_singles_non_inversion_invariant(
    r_a: float,
    r_b: float,
    m_a: int,
    m_b: int,
    set_score: tuple[int, int],
    fmt: MatchFormat,
) -> None:
    """Hypothesis: random singles matches strictly uphold Non-Inversion Invariant."""
    p_a = PlayerRatingState(player_id="a", rating=r_a, matches_played=m_a)
    p_b = PlayerRatingState(player_id="b", rating=r_b, matches_played=m_b)

    res_a, res_b = calculate_singles_rating_update(
        player_a=p_a,
        player_b=p_b,
        sets_scores=[set_score],
        match_format=fmt,
    )

    a_won = set_score[0] > set_score[1]
    if a_won:
        assert res_a.rating_delta >= 0.0
        assert res_a.post_rating >= res_a.pre_rating
        assert res_b.rating_delta <= 0.0
        assert res_b.post_rating <= res_b.pre_rating
    else:
        assert res_b.rating_delta >= 0.0
        assert res_b.post_rating >= res_b.pre_rating
        assert res_a.rating_delta <= 0.0
        assert res_a.post_rating <= res_a.pre_rating

    assert res_a.post_rating >= RATING_FLOOR
    assert res_b.post_rating >= RATING_FLOOR
