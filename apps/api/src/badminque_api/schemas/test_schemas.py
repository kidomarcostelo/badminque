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
