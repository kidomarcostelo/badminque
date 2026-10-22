"""Colocated unit and integration tests for BadminqueRatingEngine and functions.

Verifies the 6 empirical scenarios from rating-algorithm-spec.md Section 5.
Conforms to CODING_STANDARDS.md Section 1.5.
"""

from datetime import datetime, timezone
from typing import Any, cast

import pytest

from badminque_api.domain.rating.engine import (
    BadminqueRatingEngine,
    Discipline,
    PlayerProfileState,
    PlayerRatingState,
    RatingMatchInput,
    apply_retirement_forfeiture,
    calculate_doubles_rating_update,
    calculate_singles_rating_update,
)
from badminque_api.domain.rating.mov import MatchFormat

# -----------------------------------------------------------------------------
# Empirical Spec Scenarios (docs/research/rating-algorithm-spec.md Section 5)
# -----------------------------------------------------------------------------


def test_scenario_1_singles_close_match() -> None:
    """Scenario 1: Singles Evenly Matched Close Match (21-19).

    Player A (1500, N=15) vs Player B (1500, N=15), 21-19.
    Winner Player A: +6.47, Loser Player B: -6.47.
    """
    p_a = PlayerRatingState(player_id="a", rating=1500.0, matches_played=15)
    p_b = PlayerRatingState(player_id="b", rating=1500.0, matches_played=15)

    res_a, res_b = calculate_singles_rating_update(
        player_a=p_a,
        player_b=p_b,
        sets_scores=[(21, 19)],
        match_format=MatchFormat.SINGLE_21,
    )

    assert res_a.rating_delta == pytest.approx(6.47, abs=0.01)
    assert res_a.post_rating == pytest.approx(1506.47, abs=0.01)
    assert res_b.rating_delta == pytest.approx(-6.47, abs=0.01)
    assert res_b.post_rating == pytest.approx(1493.53, abs=0.01)


def test_scenario_2_singles_decisive_blowout() -> None:
    """Scenario 2: Singles Evenly Matched Decisive Blowout (21-5).

    Player A (1500, N=15) vs Player B (1500, N=15), 21-5.
    Winner Player A: +16.69, Loser Player B: -16.69.
    """
    p_a = PlayerRatingState(player_id="a", rating=1500.0, matches_played=15)
    p_b = PlayerRatingState(player_id="b", rating=1500.0, matches_played=15)

    res_a, res_b = calculate_singles_rating_update(
        player_a=p_a,
        player_b=p_b,
        sets_scores=[(21, 5)],
        match_format=MatchFormat.SINGLE_21,
    )

    assert res_a.rating_delta == pytest.approx(16.69, abs=0.02)
    assert res_b.rating_delta == pytest.approx(-16.69, abs=0.02)


def test_scenario_3_heavy_favorite_expected_blowout() -> None:
    """Scenario 3: Singles Heavy Favorite Expected Blowout (21-3).

    Player A (1800, N=15) vs Player B (1400, N=15), 21-3.
    Winner Player A: +1.11, Loser Player B: -1.11.
    """
    p_a = PlayerRatingState(player_id="a", rating=1800.0, matches_played=15)
    p_b = PlayerRatingState(player_id="b", rating=1400.0, matches_played=15)

    res_a, res_b = calculate_singles_rating_update(
        player_a=p_a,
        player_b=p_b,
        sets_scores=[(21, 3)],
        match_format=MatchFormat.SINGLE_21,
    )

    assert res_a.rating_delta == pytest.approx(1.11, abs=0.02)
    assert res_b.rating_delta == pytest.approx(-1.11, abs=0.02)


def test_scenario_4_underdog_shock_upset() -> None:
    """Scenario 4: Singles Underdog Shock Upset (21-18).

    Player A (1400, N=15) vs Player B (1800, N=15), 21-18.
    Winner Underdog A: +21.20, Loser Favorite B: -21.20.
    """
    p_a = PlayerRatingState(player_id="a", rating=1400.0, matches_played=15)
    p_b = PlayerRatingState(player_id="b", rating=1800.0, matches_played=15)

    res_a, res_b = calculate_singles_rating_update(
        player_a=p_a,
        player_b=p_b,
        sets_scores=[(21, 18)],
        match_format=MatchFormat.SINGLE_21,
    )

    assert res_a.rating_delta == pytest.approx(21.20, abs=0.02)
    assert res_b.rating_delta == pytest.approx(-21.20, abs=0.02)


def test_scenario_5a_doubles_unbalanced_team_wins() -> None:
    """Scenario 5A: Team A (1800, 1200) defeats Team B (1500, 1500) 21-14.

    A1 (1800): +4.02
    A2 (1200): +22.63
    B1, B2 (1500): -15.16 each
    """
    a1 = PlayerRatingState(player_id="a1", rating=1800.0, matches_played=15)
    a2 = PlayerRatingState(player_id="a2", rating=1200.0, matches_played=15)
    b1 = PlayerRatingState(player_id="b1", rating=1500.0, matches_played=15)
    b2 = PlayerRatingState(player_id="b2", rating=1500.0, matches_played=15)

    (res_a1, res_a2), (res_b1, res_b2) = calculate_doubles_rating_update(
        team_a=(a1, a2),
        team_b=(b1, b2),
        sets_scores=[(21, 14)],
        match_format=MatchFormat.SINGLE_21,
    )

    assert res_a1.rating_delta == pytest.approx(4.02, abs=0.02)
    assert res_a2.rating_delta == pytest.approx(22.63, abs=0.02)
    assert res_b1.rating_delta == pytest.approx(-15.16, abs=0.02)
    assert res_b2.rating_delta == pytest.approx(-15.16, abs=0.02)


def test_scenario_5b_doubles_balanced_team_wins() -> None:
    """Scenario 5B: Team B (1500, 1500) defeats Team A (1800, 1200) 21-14.

    A1 (1800 failed to carry): -18.80
    A2 (1200 protected as underdog): -3.34
    B1, B2 (1500): +9.55 each
    """
    a1 = PlayerRatingState(player_id="a1", rating=1800.0, matches_played=15)
    a2 = PlayerRatingState(player_id="a2", rating=1200.0, matches_played=15)
    b1 = PlayerRatingState(player_id="b1", rating=1500.0, matches_played=15)
    b2 = PlayerRatingState(player_id="b2", rating=1500.0, matches_played=15)

    (res_a1, res_a2), (res_b1, res_b2) = calculate_doubles_rating_update(
        team_a=(a1, a2),
        team_b=(b1, b2),
        sets_scores=[(14, 21)],
        match_format=MatchFormat.SINGLE_21,
    )

    assert res_a1.rating_delta == pytest.approx(-18.80, abs=0.02)
    assert res_a2.rating_delta == pytest.approx(-3.34, abs=0.02)
    assert res_b1.rating_delta == pytest.approx(9.55, abs=0.02)
    assert res_b2.rating_delta == pytest.approx(9.55, abs=0.02)


def test_scenario_6_provisional_calibration_trajectory() -> None:
    """Scenario 6: Provisional player plays 8 matches against 1600 opponents.

    Wins 21-14, converging from 1500 to ~1697.6 to become established.
    """
    current_player = PlayerRatingState(
        player_id="newbie",
        rating=1500.0,
        rd=350.0,
        matches_played=0,
    )
    assert current_player.is_provisional is True

    for match_index in range(1, 9):
        opponent = PlayerRatingState(
            player_id=f"opp_{match_index}",
            rating=1600.0,
            matches_played=20,
        )
        res_player, _ = calculate_singles_rating_update(
            player_a=current_player,
            player_b=opponent,
            sets_scores=[(21, 14)],
            match_format=MatchFormat.SINGLE_21,
        )
        assert res_player.rating_delta > 0.0
        current_player = PlayerRatingState(
            player_id="newbie",
            rating=res_player.post_rating,
            rd=res_player.rd_after,
            matches_played=match_index,
        )

    # After 8 matches, rating is calibrated around 1697.6 and established
    assert current_player.matches_played == 8
    assert current_player.rating == pytest.approx(1697.6, abs=1.5)
    assert current_player.is_provisional is False


# -----------------------------------------------------------------------------
# Anti-Gaming & Voided Match Rules
# -----------------------------------------------------------------------------


def test_void_match_fewer_than_11_points() -> None:
    """Matches terminated before 11 points (e.g. 6-3 injury) produce zero delta."""
    p_a = PlayerRatingState(player_id="a", rating=1500.0, rd=300.0, matches_played=5)
    p_b = PlayerRatingState(player_id="b", rating=1500.0, rd=300.0, matches_played=5)

    res_a, res_b = calculate_singles_rating_update(
        player_a=p_a,
        player_b=p_b,
        sets_scores=[(6, 3)],  # 9 points total < 11
        match_format=MatchFormat.SINGLE_21,
    )
    assert res_a.rating_delta == 0.0
    assert res_a.post_rating == 1500.0
    assert res_a.rd_after == 300.0
    assert res_b.rating_delta == 0.0
    assert res_b.post_rating == 1500.0


def test_void_doubles_match_fewer_than_11_points() -> None:
    """Doubles match with < 11 points produces zero deltas for all 4 players."""
    a1 = PlayerRatingState(player_id="a1", rating=1500.0)
    a2 = PlayerRatingState(player_id="a2", rating=1500.0)
    b1 = PlayerRatingState(player_id="b1", rating=1500.0)
    b2 = PlayerRatingState(player_id="b2", rating=1500.0)

    (r_a1, r_a2), (r_b1, r_b2) = calculate_doubles_rating_update(
        team_a=(a1, a2),
        team_b=(b1, b2),
        sets_scores=[(5, 5)],  # 10 points < 11
        match_format=MatchFormat.SINGLE_21,
    )
    for res in [r_a1, r_a2, r_b1, r_b2]:
        assert res.rating_delta == 0.0
        assert res.post_rating == 1500.0


# -----------------------------------------------------------------------------
# Validation Errors & Edge Cases
# -----------------------------------------------------------------------------


def test_doubles_duplicate_players_raises() -> None:
    """Duplicate player ID across doubles teams raises ValueError."""
    a1 = PlayerRatingState(player_id="shared_id", rating=1500.0)
    a2 = PlayerRatingState(player_id="p2", rating=1500.0)
    b1 = PlayerRatingState(player_id="shared_id", rating=1500.0)
    b2 = PlayerRatingState(player_id="p4", rating=1500.0)

    with pytest.raises(ValueError, match="must be distinct"):
        calculate_doubles_rating_update(
            team_a=(a1, a2),
            team_b=(b1, b2),
            sets_scores=[(21, 15)],
        )


def test_doubles_invalid_team_size_raises() -> None:
    """Doubles with incorrect number of players raises ValueError."""
    a1 = PlayerRatingState(player_id="p1", rating=1500.0)
    b1 = PlayerRatingState(player_id="p2", rating=1500.0)
    b2 = PlayerRatingState(player_id="p3", rating=1500.0)

    with pytest.raises(ValueError, match="requires exactly 2 players per team"):
        calculate_doubles_rating_update(
            team_a=cast(Any, (a1,)),
            team_b=(b1, b2),
            sets_scores=[(21, 15)],
        )


def test_empty_scores_raises() -> None:
    """Empty sets scores raises ValueError."""
    p_a = PlayerRatingState(player_id="a", rating=1500.0)
    p_b = PlayerRatingState(player_id="b", rating=1500.0)

    with pytest.raises(ValueError, match="at least one completed set score"):
        calculate_singles_rating_update(player_a=p_a, player_b=p_b, sets_scores=[])


def test_tied_sets_raises() -> None:
    """Tied set scores with no decisive winner raises ValueError."""
    p_a = PlayerRatingState(player_id="a", rating=1500.0)
    p_b = PlayerRatingState(player_id="b", rating=1500.0)

    with pytest.raises(ValueError, match="cannot be tied"):
        calculate_singles_rating_update(
            player_a=p_a,
            player_b=p_b,
            sets_scores=[(21, 21)],
        )


def test_singles_identical_players_raises() -> None:
    """Singles match with the same player playing themselves raises ValueError."""
    p_a = PlayerRatingState(player_id="same_id", rating=1500.0)
    with pytest.raises(ValueError, match="requires 2 distinct players"):
        calculate_singles_rating_update(
            player_a=p_a, player_b=p_a, sets_scores=[(21, 15)]
        )


# -----------------------------------------------------------------------------
# Discipline Independence (AGENTS.md Invariant 1)
# -----------------------------------------------------------------------------


def test_discipline_independence_in_profile() -> None:
    """Singles and Doubles ratings are maintained separately with zero bleed."""
    profile = PlayerProfileState.create_default(player_id="p1", name="Alice")
    assert profile.singles.rating == 1500.0
    assert profile.doubles.rating == 1500.0

    # Fold a doubles match
    match_doubles = RatingMatchInput(
        match_id="m1",
        recorded_at=datetime.now(timezone.utc),
        sequence_num=1,
        discipline=Discipline.DOUBLES,
        format=MatchFormat.SINGLE_21,
        team_a_player_ids=("p1", "p2"),
        team_b_player_ids=("p3", "p4"),
        team_a_scores=(21,),
        team_b_scores=(14,),
    )
    profiles = {"p1": profile}
    updated_profiles, _ = BadminqueRatingEngine.fold_match(profiles, match_doubles)

    # Alice's doubles rating increased
    assert updated_profiles["p1"].doubles.rating > 1500.0
    assert updated_profiles["p1"].doubles.matches_played == 1

    # Alice's singles rating remained strictly untouched (1500.0, 0 matches)
    assert updated_profiles["p1"].singles.rating == 1500.0
    assert updated_profiles["p1"].singles.matches_played == 0

    # Fold a singles match
    match_singles = RatingMatchInput(
        match_id="m2",
        recorded_at=datetime.now(timezone.utc),
        sequence_num=2,
        discipline=Discipline.SINGLES,
        format=MatchFormat.SINGLE_21,
        team_a_player_ids=("p1",),
        team_b_player_ids=("p5",),
        team_a_scores=(21,),
        team_b_scores=(10,),
    )
    updated_profiles_2, _ = BadminqueRatingEngine.fold_match(
        updated_profiles, match_singles
    )

    # Alice's singles rating increased
    assert updated_profiles_2["p1"].singles.rating > 1500.0
    assert updated_profiles_2["p1"].singles.matches_played == 1

    # Alice's doubles rating remains at the value from match 1 (not altered by singles)
    assert (
        updated_profiles_2["p1"].doubles.rating == updated_profiles["p1"].doubles.rating
    )
    assert updated_profiles_2["p1"].doubles.matches_played == 1


# -----------------------------------------------------------------------------
# Batch Folding & Chronological Order Invariance
# -----------------------------------------------------------------------------


def test_fold_batch_chronological_ordering() -> None:
    """fold_batch sorts matches by (recorded_at, sequence_num) before recomputation."""
    t1 = datetime(2026, 10, 22, 10, 0, 0, tzinfo=timezone.utc)
    t2 = datetime(2026, 10, 22, 10, 30, 0, tzinfo=timezone.utc)

    m1 = RatingMatchInput(
        match_id="match_first",
        recorded_at=t1,
        sequence_num=1,
        discipline=Discipline.SINGLES,
        format=MatchFormat.SINGLE_21,
        team_a_player_ids=("p1",),
        team_b_player_ids=("p2",),
        team_a_scores=(21,),
        team_b_scores=(15,),
    )
    m2 = RatingMatchInput(
        match_id="match_second",
        recorded_at=t2,
        sequence_num=2,
        discipline=Discipline.SINGLES,
        format=MatchFormat.SINGLE_21,
        team_a_player_ids=("p1",),
        team_b_player_ids=("p2",),
        team_a_scores=(21,),
        team_b_scores=(15,),
    )

    # Pass in scrambled order [m2, m1]
    profiles_ordered, _ = BadminqueRatingEngine.fold_batch({}, [m1, m2])
    profiles_scrambled, _ = BadminqueRatingEngine.fold_batch({}, [m2, m1])

    # Recomputation must be identical regardless of input list permutation
    assert (
        profiles_ordered["p1"].singles.rating == profiles_scrambled["p1"].singles.rating
    )
    assert (
        profiles_ordered["p2"].singles.rating == profiles_scrambled["p2"].singles.rating
    )


def test_player_rating_state_confidence_interval() -> None:
    """Confidence interval is rating +/- 1.96 * RD."""
    state = PlayerRatingState(player_id="test", rating=1500.0, rd=100.0)
    low, high = state.confidence_interval
    assert low == 1304.0
    assert high == 1696.0


def test_player_profile_state_default_init() -> None:
    """PlayerProfileState initializes default singles and doubles when omitted."""
    profile = PlayerProfileState(player_id="default_init")
    assert profile.singles.rating == 1500.0
    assert profile.doubles.rating == 1500.0
    assert profile.get_state_for_discipline(Discipline.SINGLES) == profile.singles
    assert profile.get_state_for_discipline(Discipline.DOUBLES) == profile.doubles


def test_doubles_empty_scores_raises() -> None:
    """Doubles with empty set scores raises ValueError."""
    a1 = PlayerRatingState(player_id="a1", rating=1500.0)
    a2 = PlayerRatingState(player_id="a2", rating=1500.0)
    b1 = PlayerRatingState(player_id="b1", rating=1500.0)
    b2 = PlayerRatingState(player_id="b2", rating=1500.0)
    with pytest.raises(ValueError, match="at least one completed set score"):
        calculate_doubles_rating_update(
            team_a=(a1, a2),
            team_b=(b1, b2),
            sets_scores=[],
        )


def test_doubles_tied_sets_raises() -> None:
    """Doubles with tied sets scores raises ValueError."""
    a1 = PlayerRatingState(player_id="a1", rating=1500.0)
    a2 = PlayerRatingState(player_id="a2", rating=1500.0)
    b1 = PlayerRatingState(player_id="b1", rating=1500.0)
    b2 = PlayerRatingState(player_id="b2", rating=1500.0)
    with pytest.raises(ValueError, match="cannot be tied"):
        calculate_doubles_rating_update(
            team_a=(a1, a2),
            team_b=(b1, b2),
            sets_scores=[(21, 21)],
        )


def test_singles_player_b_wins() -> None:
    """When player B wins singles match, player B gains rating and A loses."""
    p_a = PlayerRatingState(player_id="a", rating=1500.0, matches_played=15)
    p_b = PlayerRatingState(player_id="b", rating=1500.0, matches_played=15)

    res_a, res_b = calculate_singles_rating_update(
        player_a=p_a,
        player_b=p_b,
        sets_scores=[(15, 21)],
        match_format=MatchFormat.SINGLE_21,
    )
    assert res_b.rating_delta > 0.0
    assert res_a.rating_delta < 0.0
    assert res_b.post_rating > 1500.0
    assert res_a.post_rating < 1500.0


def test_engine_constants_and_class_bindings() -> None:
    """Verify BadminqueRatingEngine class attributes and static bindings."""
    assert BadminqueRatingEngine.K_MAX == 64.0
    assert BadminqueRatingEngine.K_MIN == 16.0
    assert BadminqueRatingEngine.RATING_FLOOR == 800.0
    assert BadminqueRatingEngine.INITIAL_RATING_BASELINE == 1500.0
    assert callable(BadminqueRatingEngine.calculate_doubles_rating_update)
    assert callable(BadminqueRatingEngine.calculate_singles_rating_update)
    assert callable(BadminqueRatingEngine.apply_retirement_forfeiture)


# -----------------------------------------------------------------------------
# Edge Cases, Retirement Forfeiture & Inactivity Integration
# -----------------------------------------------------------------------------


def test_best_of_3_winner_fewer_aggregate_points() -> None:
    """Best-of-3 match where winner scores fewer aggregate points (e.g. 5-21, 21-19).

    Match winner Player A scored 47 points; Player B scored 59 points.
    Player A won 2 sets to 1.
    Engine must calculate valid rating deltas without raising ValueError.
    """
    player_a = PlayerRatingState(player_id="a", rating=1500.0, matches_played=15)
    player_b = PlayerRatingState(player_id="b", rating=1500.0, matches_played=15)

    res_a, res_b = calculate_singles_rating_update(
        player_a=player_a,
        player_b=player_b,
        sets_scores=[(5, 21), (21, 19), (21, 19)],
        match_format=MatchFormat.BEST_OF_3,
    )

    assert res_a.rating_delta > 0.0
    assert res_a.post_rating > 1500.0
    assert res_b.rating_delta < 0.0
    assert res_b.post_rating < 1500.0
    assert res_a.post_rating >= BadminqueRatingEngine.RATING_FLOOR
    assert res_b.post_rating >= BadminqueRatingEngine.RATING_FLOOR


def test_doubles_best_of_3_winner_fewer_aggregate_points() -> None:
    """Doubles Best-of-3 where winning team has fewer aggregate points."""
    a1 = PlayerRatingState(player_id="a1", rating=1500.0, matches_played=15)
    a2 = PlayerRatingState(player_id="a2", rating=1500.0, matches_played=15)
    b1 = PlayerRatingState(player_id="b1", rating=1500.0, matches_played=15)
    b2 = PlayerRatingState(player_id="b2", rating=1500.0, matches_played=15)

    (r_a1, r_a2), (r_b1, r_b2) = calculate_doubles_rating_update(
        team_a=(a1, a2),
        team_b=(b1, b2),
        sets_scores=[(3, 21), (22, 20), (22, 20)],
        match_format=MatchFormat.BEST_OF_3,
    )

    assert r_a1.rating_delta > 0.0
    assert r_a2.rating_delta > 0.0
    assert r_b1.rating_delta < 0.0
    assert r_b2.rating_delta < 0.0


def test_fold_match_voided_preserves_matches_played() -> None:
    """Folding a voided match (<11 points) does NOT increment matches_played."""
    profile_a = PlayerProfileState.create_default(player_id="p1")
    profile_b = PlayerProfileState.create_default(player_id="p2")

    match = RatingMatchInput(
        match_id="void_match",
        recorded_at=datetime.now(timezone.utc),
        sequence_num=1,
        discipline=Discipline.SINGLES,
        format=MatchFormat.SINGLE_21,
        team_a_player_ids=("p1",),
        team_b_player_ids=("p2",),
        team_a_scores=(5,),
        team_b_scores=(3,),  # 8 points < 11
    )

    profiles, deltas = BadminqueRatingEngine.fold_match(
        {"p1": profile_a, "p2": profile_b}, match
    )

    assert deltas[0].rating_delta == 0.0
    assert deltas[1].rating_delta == 0.0
    assert profiles["p1"].singles.matches_played == 0
    assert profiles["p2"].singles.matches_played == 0
    assert profiles["p1"].singles.rating == 1500.0
    assert profiles["p2"].singles.rating == 1500.0


def test_fold_match_inactivity_inflation() -> None:
    """Folding a match after > 30 days inactivity inflates RD before calculation."""
    t_start = datetime(2026, 1, 1, 10, 0, 0, tzinfo=timezone.utc)
    t_later = datetime(2026, 3, 2, 10, 0, 0, tzinfo=timezone.utc)  # 60 days later

    state_alice = PlayerRatingState(
        player_id="alice",
        rating=1600.0,
        rd=80.0,
        matches_played=10,
        last_played_at=t_start,
    )
    profile_alice = PlayerProfileState(player_id="alice", singles=state_alice)

    match = RatingMatchInput(
        match_id="m_dormant",
        recorded_at=t_later,
        sequence_num=1,
        discipline=Discipline.SINGLES,
        format=MatchFormat.SINGLE_21,
        team_a_player_ids=("alice",),
        team_b_player_ids=("bob",),
        team_a_scores=(21,),
        team_b_scores=(15,),
    )

    profiles, _ = BadminqueRatingEngine.fold_match({"alice": profile_alice}, match)
    updated_alice = profiles["alice"].singles

    assert updated_alice.matches_played == 11
    assert updated_alice.last_played_at == t_later


def test_apply_retirement_forfeiture_under_11_points_voids() -> None:
    """Retirement when total points < 11 voids the match."""
    scores = [(5, 3)]  # 8 points
    adjusted, is_voided = apply_retirement_forfeiture(scores, retiring_team=1)
    assert is_voided is True
    assert adjusted == [(5, 3)]


def test_apply_retirement_forfeiture_over_11_points_awards_to_21() -> None:
    """Retirement when total points >= 11 awards the remaining points to 21."""
    # Team B retires at 14-12 in set 1
    scores = [(14, 12)]
    adjusted, is_voided = apply_retirement_forfeiture(scores, retiring_team=2)
    assert is_voided is False
    assert adjusted == [(21, 12)]

    # Team A retires at 12-14 in set 1
    adjusted_a, is_voided_a = apply_retirement_forfeiture(scores, retiring_team=1)
    assert is_voided_a is False
    assert adjusted_a == [(14, 21)]


def test_apply_retirement_forfeiture_invalid_inputs_raise() -> None:
    """Invalid retiring team or empty scores raise ValueError."""
    with pytest.raises(ValueError, match="retiring_team must be 1 or 2"):
        apply_retirement_forfeiture([(10, 5)], retiring_team=3)
    with pytest.raises(ValueError, match="sets_scores must contain at least one set"):
        apply_retirement_forfeiture([], retiring_team=1)
    with pytest.raises(ValueError, match="Set scores must be non-negative"):
        apply_retirement_forfeiture([(-1, 5)], retiring_team=1)


def test_score_validation_guards_in_rating_updates() -> None:
    """Negative and tied scores raise ValueError in rating calculations."""
    p_a = PlayerRatingState(player_id="a", rating=1500.0)
    p_b = PlayerRatingState(player_id="b", rating=1500.0)

    # Negative score in singles
    with pytest.raises(ValueError, match="Set scores must be non-negative"):
        calculate_singles_rating_update(p_a, p_b, sets_scores=[(-1, 21)])

    # Tied individual set score in singles
    with pytest.raises(ValueError, match="Individual set score cannot be tied"):
        calculate_singles_rating_update(p_a, p_b, sets_scores=[(20, 20)])

    # Negative score in doubles
    a1 = PlayerRatingState(player_id="a1", rating=1500.0)
    a2 = PlayerRatingState(player_id="a2", rating=1500.0)
    b1 = PlayerRatingState(player_id="b1", rating=1500.0)
    b2 = PlayerRatingState(player_id="b2", rating=1500.0)

    with pytest.raises(ValueError, match="Set scores must be non-negative"):
        calculate_doubles_rating_update((a1, a2), (b1, b2), sets_scores=[(21, -5)])

    with pytest.raises(ValueError, match="Individual set score cannot be tied"):
        calculate_doubles_rating_update((a1, a2), (b1, b2), sets_scores=[(19, 19)])


def test_fold_match_validation_guards() -> None:
    """fold_match guards against malformed match inputs."""
    t0 = datetime.now(timezone.utc)

    # Mismatched score lengths
    m_bad_scores = RatingMatchInput(
        match_id="bad_scores",
        recorded_at=t0,
        sequence_num=1,
        discipline=Discipline.SINGLES,
        format=MatchFormat.SINGLE_21,
        team_a_player_ids=("p1",),
        team_b_player_ids=("p2",),
        team_a_scores=(21, 21),
        team_b_scores=(15,),
    )
    with pytest.raises(ValueError, match="Mismatched score lengths"):
        BadminqueRatingEngine.fold_match({}, m_bad_scores)

    # Singles with wrong player counts
    m_bad_singles = RatingMatchInput(
        match_id="bad_singles",
        recorded_at=t0,
        sequence_num=2,
        discipline=Discipline.SINGLES,
        format=MatchFormat.SINGLE_21,
        team_a_player_ids=("p1", "p2"),
        team_b_player_ids=("p3",),
        team_a_scores=(21,),
        team_b_scores=(15,),
    )
    with pytest.raises(ValueError, match="Singles match requires 1 player"):
        BadminqueRatingEngine.fold_match({}, m_bad_singles)

    # Doubles with wrong player counts
    m_bad_doubles = RatingMatchInput(
        match_id="bad_doubles",
        recorded_at=t0,
        sequence_num=3,
        discipline=Discipline.DOUBLES,
        format=MatchFormat.SINGLE_21,
        team_a_player_ids=("p1",),
        team_b_player_ids=("p2", "p3"),
        team_a_scores=(21,),
        team_b_scores=(15,),
    )
    with pytest.raises(ValueError, match="Doubles match requires 2 players"):
        BadminqueRatingEngine.fold_match({}, m_bad_doubles)


def test_player_profile_with_updated_discipline_mismatched_id_raises() -> None:
    """with_updated_discipline raises ValueError if updated_state has mismatched id."""
    profile = PlayerProfileState.create_default(player_id="p1")
    other_state = PlayerRatingState(player_id="p2", rating=1600.0)

    with pytest.raises(ValueError, match="Mismatched player_id"):
        profile.with_updated_discipline(Discipline.SINGLES, other_state)


def test_tied_sets_across_match_raises() -> None:
    """Tied match sets across multiple sets raise ValueError in singles and doubles."""
    p_a = PlayerRatingState(player_id="a", rating=1500.0)
    p_b = PlayerRatingState(player_id="b", rating=1500.0)

    # 1 set each: 1-1 tied match sets
    with pytest.raises(ValueError, match="Match sets cannot be tied"):
        calculate_singles_rating_update(p_a, p_b, sets_scores=[(21, 15), (15, 21)])

    a1 = PlayerRatingState(player_id="a1", rating=1500.0)
    a2 = PlayerRatingState(player_id="a2", rating=1500.0)
    b1 = PlayerRatingState(player_id="b1", rating=1500.0)
    b2 = PlayerRatingState(player_id="b2", rating=1500.0)

    with pytest.raises(ValueError, match="Match sets cannot be tied"):
        calculate_doubles_rating_update(
            (a1, a2), (b1, b2), sets_scores=[(21, 15), (15, 21)]
        )


def test_fold_match_empty_scores_raises() -> None:
    """fold_match raises ValueError when team scores are empty."""
    m = RatingMatchInput(
        match_id="empty_scores",
        recorded_at=datetime.now(timezone.utc),
        sequence_num=1,
        discipline=Discipline.SINGLES,
        format=MatchFormat.SINGLE_21,
        team_a_player_ids=("p1",),
        team_b_player_ids=("p2",),
        team_a_scores=(),
        team_b_scores=(),
    )
    with pytest.raises(ValueError, match="at least one set score"):
        BadminqueRatingEngine.fold_match({}, m)


def test_fold_doubles_match_voided_preserves_matches_played() -> None:
    """Folding a voided doubles match (<11 points) preserves previous profile state."""
    p1 = PlayerProfileState.create_default(player_id="p1")
    p2 = PlayerProfileState.create_default(player_id="p2")
    p3 = PlayerProfileState.create_default(player_id="p3")
    p4 = PlayerProfileState.create_default(player_id="p4")

    match = RatingMatchInput(
        match_id="void_doubles",
        recorded_at=datetime.now(timezone.utc),
        sequence_num=1,
        discipline=Discipline.DOUBLES,
        format=MatchFormat.SINGLE_21,
        team_a_player_ids=("p1", "p2"),
        team_b_player_ids=("p3", "p4"),
        team_a_scores=(5,),
        team_b_scores=(3,),
    )
    profiles, deltas = BadminqueRatingEngine.fold_match(
        {"p1": p1, "p2": p2, "p3": p3, "p4": p4}, match
    )
    for pid in ["p1", "p2", "p3", "p4"]:
        assert profiles[pid].doubles.matches_played == 0
        assert profiles[pid].doubles.rating == 1500.0
    for d in deltas:
        assert d.rating_delta == 0.0


def test_inactivity_timezone_handling_and_past_timestamps() -> None:
    """Inactivity calculation normalizes timezones and ignores past matches."""
    t_aware = datetime(2026, 1, 1, 10, 0, 0, tzinfo=timezone.utc)
    t_naive_later = datetime(2026, 3, 2, 10, 0, 0)  # 60 days later naive

    state_aware = PlayerRatingState(
        player_id="aware_p",
        rating=1500.0,
        rd=80.0,
        matches_played=10,
        last_played_at=t_aware,
    )
    profile_aware = PlayerProfileState(player_id="aware_p", singles=state_aware)

    m1 = RatingMatchInput(
        match_id="naive_match",
        recorded_at=t_naive_later,
        sequence_num=1,
        discipline=Discipline.SINGLES,
        format=MatchFormat.SINGLE_21,
        team_a_player_ids=("aware_p",),
        team_b_player_ids=("p_opp",),
        team_a_scores=(21,),
        team_b_scores=(15,),
    )
    profiles, _ = BadminqueRatingEngine.fold_match({"aware_p": profile_aware}, m1)
    assert profiles["aware_p"].singles.matches_played == 11

    # Match in past relative to last_played_at produces delta_seconds <= 0
    t_past = datetime(2025, 12, 1, 10, 0, 0, tzinfo=timezone.utc)
    m_past = RatingMatchInput(
        match_id="past_match",
        recorded_at=t_past,
        sequence_num=2,
        discipline=Discipline.SINGLES,
        format=MatchFormat.SINGLE_21,
        team_a_player_ids=("aware_p",),
        team_b_player_ids=("p_opp",),
        team_a_scores=(21,),
        team_b_scores=(15,),
    )
    profiles_past, _ = BadminqueRatingEngine.fold_match(
        {"aware_p": profile_aware}, m_past
    )
    assert profiles_past["aware_p"].singles.matches_played == 11

    # Naive last_played_at with aware match_recorded_at
    state_naive = PlayerRatingState(
        player_id="naive_p",
        rating=1500.0,
        rd=80.0,
        matches_played=10,
        last_played_at=datetime(2026, 1, 1, 10, 0, 0),
    )
    profile_naive = PlayerProfileState(player_id="naive_p", singles=state_naive)
    m_aware = RatingMatchInput(
        match_id="aware_match",
        recorded_at=datetime(2026, 3, 2, 10, 0, 0, tzinfo=timezone.utc),
        sequence_num=3,
        discipline=Discipline.SINGLES,
        format=MatchFormat.SINGLE_21,
        team_a_player_ids=("naive_p",),
        team_b_player_ids=("p_opp",),
        team_a_scores=(21,),
        team_b_scores=(15,),
    )
    profiles_aware, _ = BadminqueRatingEngine.fold_match(
        {"naive_p": profile_naive}, m_aware
    )
    assert profiles_aware["naive_p"].singles.matches_played == 11
