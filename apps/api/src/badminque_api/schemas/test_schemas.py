"""Tests for Pydantic v2 schemas and domain business invariant validation."""

import uuid
from datetime import datetime, timezone

import pytest
from pydantic import ValidationError

from badminque_api.schemas.match import (
    DisciplineEnum,
    MatchFormatEnum,
    MatchRecordCreate,
)
from badminque_api.schemas.player import (
    PlayerPassportResponse,
    RosterPlayerCreate,
    RosterPlayerResponse,
    SkillTierEnum,
)
from badminque_api.schemas.sync import BatchSyncRequest


def test_valid_doubles_match_record() -> None:
    """Verifies that a valid doubles match record parses successfully."""
    match_id = uuid.uuid4()
    club_night_id = uuid.uuid4()
    p1, p2, p3, p4 = uuid.uuid4(), uuid.uuid4(), uuid.uuid4(), uuid.uuid4()

    record = MatchRecordCreate(
        id=match_id,
        club_night_id=club_night_id,
        court_id=1,
        discipline=DisciplineEnum.DOUBLES,
        format=MatchFormatEnum.SINGLE_30,
        team_a_player_ids=[p1, p2],
        team_b_player_ids=[p3, p4],
        team_a_scores=[30],
        team_b_scores=[28],
        recorded_at=datetime.now(timezone.utc),
        sequence_num=1,
    )
    assert record.id == match_id
    assert record.discipline == DisciplineEnum.DOUBLES
    assert record.team_a_scores == [30]
    assert record.team_b_scores == [28]


def test_valid_singles_match_record() -> None:
    """Verifies that a valid singles match record parses successfully."""
    p1, p2 = uuid.uuid4(), uuid.uuid4()

    record = MatchRecordCreate(
        id=uuid.uuid4(),
        club_night_id=uuid.uuid4(),
        court_id=2,
        discipline=DisciplineEnum.SINGLES,
        format=MatchFormatEnum.SINGLE_21,
        team_a_player_ids=[p1],
        team_b_player_ids=[p2],
        team_a_scores=[21],
        team_b_scores=[19],
        recorded_at=datetime.now(timezone.utc),
        sequence_num=2,
    )
    assert record.discipline == DisciplineEnum.SINGLES
    assert len(record.team_a_player_ids) == 1
    assert len(record.team_b_player_ids) == 1


def test_score_limits_enforced_upper_bound() -> None:
    """Rejects match scores above 30 (OVERTIME_SET_CAP)."""
    p1, p2 = uuid.uuid4(), uuid.uuid4()

    with pytest.raises(ValidationError, match="must be between 0 and 30"):
        MatchRecordCreate(
            id=uuid.uuid4(),
            club_night_id=uuid.uuid4(),
            court_id=1,
            discipline=DisciplineEnum.SINGLES,
            format=MatchFormatEnum.SINGLE_30,
            team_a_player_ids=[p1],
            team_b_player_ids=[p2],
            team_a_scores=[31],
            team_b_scores=[29],
            recorded_at=datetime.now(timezone.utc),
            sequence_num=1,
        )


def test_score_limits_enforced_lower_bound() -> None:
    """Rejects negative match scores."""
    p1, p2 = uuid.uuid4(), uuid.uuid4()

    with pytest.raises(ValidationError, match="must be between 0 and 30"):
        MatchRecordCreate(
            id=uuid.uuid4(),
            club_night_id=uuid.uuid4(),
            court_id=1,
            discipline=DisciplineEnum.SINGLES,
            format=MatchFormatEnum.SINGLE_30,
            team_a_player_ids=[p1],
            team_b_player_ids=[p2],
            team_a_scores=[-1],
            team_b_scores=[21],
            recorded_at=datetime.now(timezone.utc),
            sequence_num=1,
        )


def test_rejects_duplicate_player_across_teams() -> None:
    """Rejects a match where the same player is listed on both sides."""
    p1, p2, p3 = uuid.uuid4(), uuid.uuid4(), uuid.uuid4()

    with pytest.raises(
        ValidationError, match="All player UUIDs in a match must be unique"
    ):
        MatchRecordCreate(
            id=uuid.uuid4(),
            club_night_id=uuid.uuid4(),
            court_id=1,
            discipline=DisciplineEnum.DOUBLES,
            format=MatchFormatEnum.SINGLE_30,
            team_a_player_ids=[p1, p2],
            team_b_player_ids=[p1, p3],
            team_a_scores=[30],
            team_b_scores=[20],
            recorded_at=datetime.now(timezone.utc),
            sequence_num=1,
        )


def test_rejects_mismatched_score_lengths() -> None:
    """Rejects when team A has more scores than team B."""
    p1, p2 = uuid.uuid4(), uuid.uuid4()

    with pytest.raises(ValidationError, match="matching score count"):
        MatchRecordCreate(
            id=uuid.uuid4(),
            club_night_id=uuid.uuid4(),
            court_id=1,
            discipline=DisciplineEnum.SINGLES,
            format=MatchFormatEnum.BEST_OF_3,
            team_a_player_ids=[p1],
            team_b_player_ids=[p2],
            team_a_scores=[21, 15],
            team_b_scores=[19],
            recorded_at=datetime.now(timezone.utc),
            sequence_num=1,
        )


def test_roster_player_and_passport_schemas() -> None:
    """Verifies player domain schemas and default baseline rating."""
    player_id = uuid.uuid4()
    club_id = uuid.uuid4()

    roster_player = RosterPlayerCreate(
        id=player_id,
        club_id=club_id,
        name="Marcus Gideon",
        auth_user_id=None,
    )
    assert roster_player.singles_rating == 1500.0
    assert roster_player.doubles_rating == 1500.0
    assert roster_player.auth_user_id is None

    passport = PlayerPassportResponse(
        player_id=player_id,
        name="Marcus Gideon",
        singles_rating=1550.0,
        doubles_rating=1620.0,
        singles_matches_played=3,
        doubles_matches_played=12,
        club_name="PB Jaya Raya",
    )
    assert passport.doubles_rating == 1620.0
    assert passport.doubles_matches_played == 12


def test_batch_sync_request_schema() -> None:
    """Verifies batch synchronization payload model."""
    club_night_id = uuid.uuid4()
    sync_payload = BatchSyncRequest(
        club_night_id=club_night_id,
        matches=[],
    )
    assert sync_payload.club_night_id == club_night_id
    assert sync_payload.matches == []


def test_player_rating_delta_response() -> None:
    """Verifies PlayerRatingDeltaResponse schema validation and DUBR fields."""
    from badminque_api.schemas.match import (
        MatchRecordingResponse,
        MatchRecordResponse,
        PlayerRatingDeltaResponse,
    )

    player_id = uuid.uuid4()
    delta_res = PlayerRatingDeltaResponse(
        player_id=player_id,
        player_name="Alice Smith",
        pre_rating=1500.0,
        post_rating=1534.0,
        rating_delta=34.0,
        pre_dubr=3.750,
        post_dubr=3.835,
        dubr_delta=0.085,
        k_factor=64.0,
        rd_after=350.0,
        is_provisional=True,
        matches_played_after=1,
    )
    assert delta_res.player_id == player_id
    assert delta_res.dubr_delta == 0.085
    assert delta_res.post_dubr == 3.835
    assert delta_res.is_provisional is True

    match_id = uuid.uuid4()
    club_night_id = uuid.uuid4()
    match_resp = MatchRecordResponse(
        id=match_id,
        club_night_id=club_night_id,
        court_id=1,
        discipline=DisciplineEnum.DOUBLES,
        format=MatchFormatEnum.SINGLE_21,
        team_a_player_ids=[player_id, uuid.uuid4()],
        team_b_player_ids=[uuid.uuid4(), uuid.uuid4()],
        team_a_scores=[21],
        team_b_scores=[19],
        recorded_at=datetime.now(timezone.utc),
        sequence_num=1,
        created_at=datetime.now(timezone.utc),
    )

    outcome = MatchRecordingResponse(
        match=match_resp,
        deltas=[delta_res],
    )
    assert outcome.match.id == match_id
    assert len(outcome.deltas) == 1
    assert outcome.deltas[0].player_name == "Alice Smith"


def test_rejects_tied_set_score() -> None:
    """Rejects match when an individual set score is tied (e.g. 21-21)."""
    p1, p2 = uuid.uuid4(), uuid.uuid4()

    with pytest.raises(ValidationError, match="Individual set score cannot be tied"):
        MatchRecordCreate(
            id=uuid.uuid4(),
            club_night_id=uuid.uuid4(),
            court_id=1,
            discipline=DisciplineEnum.SINGLES,
            format=MatchFormatEnum.SINGLE_21,
            team_a_player_ids=[p1],
            team_b_player_ids=[p2],
            team_a_scores=[21],
            team_b_scores=[21],
            recorded_at=datetime.now(timezone.utc),
            sequence_num=1,
        )


def test_rejects_tied_match_sets() -> None:
    """Rejects match when total sets won are tied in multi-set format."""
    p1, p2 = uuid.uuid4(), uuid.uuid4()

    with pytest.raises(ValidationError, match="decisive winner is required"):
        MatchRecordCreate(
            id=uuid.uuid4(),
            club_night_id=uuid.uuid4(),
            court_id=1,
            discipline=DisciplineEnum.SINGLES,
            format=MatchFormatEnum.BEST_OF_3,
            team_a_player_ids=[p1],
            team_b_player_ids=[p2],
            team_a_scores=[21, 15],
            team_b_scores=[18, 21],
            recorded_at=datetime.now(timezone.utc),
            sequence_num=1,
        )


def test_roster_player_create_with_tier_and_dubr() -> None:
    """Verifies RosterPlayerCreate supports initial_tier and decimal DUBR values."""
    player_id = uuid.uuid4()
    player = RosterPlayerCreate(
        id=player_id,
        name="Marcus Gideon",
        initial_tier=SkillTierEnum.BEGINNER,
        singles_dubr=2.500,
        doubles_dubr=2.500,
    )
    assert player.initial_tier == SkillTierEnum.BEGINNER
    assert player.singles_dubr == 2.500
    assert player.doubles_dubr == 2.500


def test_roster_player_create_dubr_range_validation() -> None:
    """Rejects DUBR values below 2.0 or above 7.0 in RosterPlayerCreate."""
    with pytest.raises(ValidationError):
        RosterPlayerCreate(name="Invalid Player", doubles_dubr=1.999)

    with pytest.raises(ValidationError):
        RosterPlayerCreate(name="Invalid Player", doubles_dubr=7.001)


def test_roster_player_response_computed_dubr_and_provisional() -> None:
    """Verifies RosterPlayerResponse computes dubr and provisional."""
    player_id = uuid.uuid4()
    club_id = uuid.uuid4()

    response = RosterPlayerResponse(
        id=player_id,
        club_id=club_id,
        name="Kevin Sukamuljo",
        singles_rating=1400.0,
        doubles_rating=1400.0,
        matches_played=3,
        initial_tier=SkillTierEnum.INTERMEDIATE,
        created_at=datetime.now(timezone.utc),
    )

    assert response.singles_dubr == 3.500
    assert response.doubles_dubr == 3.500
    assert response.is_provisional is True
    assert response.initial_tier == SkillTierEnum.INTERMEDIATE

    # After 8 matches, is_provisional becomes False
    graduated_response = RosterPlayerResponse(
        id=player_id,
        club_id=club_id,
        name="Kevin Sukamuljo",
        singles_rating=1800.0,
        doubles_rating=1800.0,
        matches_played=8,
        initial_tier=SkillTierEnum.ADVANCED,
        created_at=datetime.now(timezone.utc),
    )
    assert graduated_response.singles_dubr == 4.500
    assert graduated_response.doubles_dubr == 4.500
    assert graduated_response.is_provisional is False
