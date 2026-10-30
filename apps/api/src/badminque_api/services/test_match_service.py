"""Colocated integration tests for MatchService.

Verifies match score submission, rating updates in storage,
idempotency, and batch fold recomputation.
Conforms strictly to ADR 0002, AGENTS.md, and CODING_STANDARDS.md Section 1.5.
"""

import uuid
from collections.abc import AsyncGenerator
from datetime import date, datetime, timezone

import pytest
from sqlalchemy import select
from sqlalchemy.ext.asyncio import (
    AsyncSession,
    async_sessionmaker,
    create_async_engine,
)

from badminque_api.models import Base
from badminque_api.models.club import Club, ClubNight
from badminque_api.models.match import MatchRecord
from badminque_api.models.player import RosterPlayer
from badminque_api.schemas.match import (
    DisciplineEnum,
    MatchFormatEnum,
    MatchRecordCreate,
)
from badminque_api.schemas.sync import BatchSyncRequest
from badminque_api.services.match_service import MatchService


@pytest.fixture
async def test_session() -> AsyncGenerator[AsyncSession, None]:
    """Provides an isolated in-memory SQLite database session for service testing."""
    test_engine = create_async_engine(
        "sqlite+aiosqlite:///:memory:",
        echo=False,
    )
    async with test_engine.begin() as connection:
        await connection.run_sync(Base.metadata.create_all)

    session_maker = async_sessionmaker(
        bind=test_engine,
        class_=AsyncSession,
        expire_on_commit=False,
    )
    async with session_maker() as session:
        yield session

    async with test_engine.begin() as connection:
        await connection.run_sync(Base.metadata.drop_all)
    await test_engine.dispose()


@pytest.fixture
async def sample_club_and_night(
    test_session: AsyncSession,
) -> tuple[Club, ClubNight]:
    """Creates a sample club and active club night in the database."""
    club = Club(id=uuid.uuid4(), name="Metro Badminton Club")
    test_session.add(club)
    await test_session.flush()

    club_night = ClubNight(
        id=uuid.uuid4(),
        club_id=club.id,
        date=date.today(),
        status="ACTIVE",
    )
    test_session.add(club_night)
    await test_session.commit()
    await test_session.refresh(club)
    await test_session.refresh(club_night)
    return club, club_night


@pytest.fixture
async def sample_players(
    test_session: AsyncSession,
    sample_club_and_night: tuple[Club, ClubNight],
) -> list[RosterPlayer]:
    """Creates 4 roster players in the sample club."""
    club, _ = sample_club_and_night
    players = []
    names = ["Alice", "Bob", "Charlie", "Dave"]
    for name in names:
        p = RosterPlayer(
            id=uuid.uuid4(),
            club_id=club.id,
            name=name,
            singles_rating=1500.0,
            doubles_rating=1500.0,
            singles_matches_played=0,
            doubles_matches_played=0,
            status="QUEUED",
        )
        test_session.add(p)
        players.append(p)
    await test_session.commit()
    for p in players:
        await test_session.refresh(p)
    return players


async def test_record_doubles_match_updates_ratings_and_deltas(
    test_session: AsyncSession,
    sample_club_and_night: tuple[Club, ClubNight],
    sample_players: list[RosterPlayer],
) -> None:
    """Verifies doubles score recording calculates DUBR adjustments and updates."""
    club, club_night = sample_club_and_night
    p1, p2, p3, p4 = sample_players

    service = MatchService(test_session)
    match_id = uuid.uuid4()
    match_data = MatchRecordCreate(
        id=match_id,
        club_night_id=club_night.id,
        court_id=1,
        discipline=DisciplineEnum.DOUBLES,
        format=MatchFormatEnum.SINGLE_21,
        team_a_player_ids=[p1.id, p2.id],
        team_b_player_ids=[p3.id, p4.id],
        team_a_scores=[21],
        team_b_scores=[19],
        recorded_at=datetime.now(timezone.utc),
        sequence_num=1,
    )

    match_record, deltas = await service.record_match(club.id, match_data)

    assert match_record.id == match_id
    assert len(deltas) == 4

    # Winners gain rating points, losers lose rating points
    delta_p1 = next(d for d in deltas if d.player_id == p1.id)
    delta_p3 = next(d for d in deltas if d.player_id == p3.id)

    assert delta_p1.rating_delta > 0
    assert delta_p1.dubr_delta > 0
    assert delta_p1.post_rating > delta_p1.pre_rating
    assert delta_p1.is_provisional is True
    assert delta_p1.matches_played_after == 1

    assert delta_p3.rating_delta < 0
    assert delta_p3.dubr_delta < 0
    assert delta_p3.post_rating < delta_p3.pre_rating

    # Verify database persistence for players
    p1_db = await test_session.get(RosterPlayer, p1.id)
    p3_db = await test_session.get(RosterPlayer, p3.id)
    assert p1_db is not None and p3_db is not None
    assert p1_db.doubles_rating == delta_p1.post_rating
    assert p1_db.doubles_matches_played == 1
    # Verify singles rating did NOT bleed
    assert p1_db.singles_rating == 1500.0
    assert p1_db.singles_matches_played == 0

    assert p3_db.doubles_rating == delta_p3.post_rating
    assert p3_db.doubles_matches_played == 1


async def test_record_match_blowout_margin_of_victory_scaling(
    test_session: AsyncSession,
    sample_club_and_night: tuple[Club, ClubNight],
    sample_players: list[RosterPlayer],
) -> None:
    """Verifies that 21-5 blowout yields larger rating delta than 21-19."""
    club, club_night = sample_club_and_night
    p1, p2, p3, p4 = sample_players

    service = MatchService(test_session)
    match_blowout = MatchRecordCreate(
        id=uuid.uuid4(),
        club_night_id=club_night.id,
        court_id=1,
        discipline=DisciplineEnum.DOUBLES,
        format=MatchFormatEnum.SINGLE_21,
        team_a_player_ids=[p1.id, p2.id],
        team_b_player_ids=[p3.id, p4.id],
        team_a_scores=[21],
        team_b_scores=[5],
        recorded_at=datetime.now(timezone.utc),
        sequence_num=1,
    )

    _, deltas = await service.record_match(club.id, match_blowout)
    delta_p1 = next(d for d in deltas if d.player_id == p1.id)

    # 21-5 blowout delta should be larger than ~10 points on provisional K=64
    assert delta_p1.rating_delta > 30.0
    assert delta_p1.dubr_delta > 0.075


async def test_record_match_idempotency(
    test_session: AsyncSession,
    sample_club_and_night: tuple[Club, ClubNight],
    sample_players: list[RosterPlayer],
) -> None:
    """Verifies submitting duplicate match UUID does not double-count ratings."""
    club, club_night = sample_club_and_night
    p1, p2, p3, p4 = sample_players

    service = MatchService(test_session)
    match_id = uuid.uuid4()
    match_data = MatchRecordCreate(
        id=match_id,
        club_night_id=club_night.id,
        court_id=1,
        discipline=DisciplineEnum.DOUBLES,
        format=MatchFormatEnum.SINGLE_21,
        team_a_player_ids=[p1.id, p2.id],
        team_b_player_ids=[p3.id, p4.id],
        team_a_scores=[21],
        team_b_scores=[18],
        recorded_at=datetime.now(timezone.utc),
        sequence_num=1,
    )

    # First submission
    record1, deltas1 = await service.record_match(club.id, match_data)
    p1_first = await test_session.get(RosterPlayer, p1.id)
    assert p1_first is not None
    rating_after_first = p1_first.doubles_rating
    matches_after_first = p1_first.doubles_matches_played

    # Second submission with same match ID (simulated network retry)
    record2, deltas2 = await service.record_match(club.id, match_data)
    p1_second = await test_session.get(RosterPlayer, p1.id)
    assert p1_second is not None

    # Idempotent: ratings and match counts must NOT increase again
    assert record2.id == record1.id
    assert p1_second.doubles_rating == rating_after_first
    assert p1_second.doubles_matches_played == matches_after_first


async def test_batch_sync_chronological_fold(
    test_session: AsyncSession,
    sample_club_and_night: tuple[Club, ClubNight],
    sample_players: list[RosterPlayer],
) -> None:
    """Verifies offline batch sync folds matches chronologically and updates ratings."""
    club, club_night = sample_club_and_night
    p1, p2, p3, p4 = sample_players

    service = MatchService(test_session)

    # Prepare two matches arriving out of order
    time_earlier = datetime(2026, 10, 30, 18, 0, 0, tzinfo=timezone.utc)
    time_later = datetime(2026, 10, 30, 18, 20, 0, tzinfo=timezone.utc)

    match_earlier = MatchRecordCreate(
        id=uuid.uuid4(),
        club_night_id=club_night.id,
        court_id=1,
        discipline=DisciplineEnum.DOUBLES,
        format=MatchFormatEnum.SINGLE_21,
        team_a_player_ids=[p1.id, p2.id],
        team_b_player_ids=[p3.id, p4.id],
        team_a_scores=[21],
        team_b_scores=[15],
        recorded_at=time_earlier,
        sequence_num=1,
    )
    match_later = MatchRecordCreate(
        id=uuid.uuid4(),
        club_night_id=club_night.id,
        court_id=1,
        discipline=DisciplineEnum.DOUBLES,
        format=MatchFormatEnum.SINGLE_21,
        team_a_player_ids=[p1.id, p3.id],
        team_b_player_ids=[p2.id, p4.id],
        team_a_scores=[21],
        team_b_scores=[18],
        recorded_at=time_later,
        sequence_num=2,
    )

    # Send in reverse order in batch
    batch_req = BatchSyncRequest(
        club_night_id=club_night.id,
        matches=[match_later, match_earlier],
    )

    batch_resp = await service.sync_batch(club.id, batch_req)

    assert batch_resp.synced_count == 2
    assert batch_resp.ignored_duplicates_count == 0
    assert batch_resp.status == "success"

    # Both matches should be in matches table
    all_matches = (await test_session.scalars(select(MatchRecord))).all()
    assert len(all_matches) == 2

    # Players should have 2 matches played
    p1_db = await test_session.get(RosterPlayer, p1.id)
    assert p1_db is not None
    assert p1_db.doubles_matches_played == 2
    assert p1_db.doubles_rating > 1500.0  # p1 won both matches


async def test_record_singles_match_updates_only_singles(
    test_session: AsyncSession,
    sample_club_and_night: tuple[Club, ClubNight],
    sample_players: list[RosterPlayer],
) -> None:
    """Verifies singles score recording updates singles without bleeding."""
    club, club_night = sample_club_and_night
    p1, p2, _, _ = sample_players

    service = MatchService(test_session)
    match_id = uuid.uuid4()
    match_data = MatchRecordCreate(
        id=match_id,
        club_night_id=club_night.id,
        court_id=2,
        discipline=DisciplineEnum.SINGLES,
        format=MatchFormatEnum.SINGLE_21,
        team_a_player_ids=[p1.id],
        team_b_player_ids=[p2.id],
        team_a_scores=[21],
        team_b_scores=[16],
        recorded_at=datetime.now(timezone.utc),
        sequence_num=1,
    )

    match_record, deltas = await service.record_match(club.id, match_data)

    assert match_record.id == match_id
    assert len(deltas) == 2

    delta_p1 = next(d for d in deltas if d.player_id == p1.id)
    assert delta_p1.rating_delta > 0

    p1_db = await test_session.get(RosterPlayer, p1.id)
    p2_db = await test_session.get(RosterPlayer, p2.id)
    assert p1_db is not None and p2_db is not None

    # Singles updated
    assert p1_db.singles_rating == delta_p1.post_rating
    assert p1_db.singles_matches_played == 1

    # Doubles untouched
    assert p1_db.doubles_rating == 1500.0
    assert p1_db.doubles_matches_played == 0


async def test_record_voided_match_does_not_increment_matches_played(
    test_session: AsyncSession,
    sample_club_and_night: tuple[Club, ClubNight],
    sample_players: list[RosterPlayer],
) -> None:
    """Verifies <11 points produces 0 delta and no match count increment."""
    club, club_night = sample_club_and_night
    p1, p2, p3, p4 = sample_players

    service = MatchService(test_session)
    match_void = MatchRecordCreate(
        id=uuid.uuid4(),
        club_night_id=club_night.id,
        court_id=1,
        discipline=DisciplineEnum.DOUBLES,
        format=MatchFormatEnum.SINGLE_21,
        team_a_player_ids=[p1.id, p2.id],
        team_b_player_ids=[p3.id, p4.id],
        team_a_scores=[6],
        team_b_scores=[2],
        recorded_at=datetime.now(timezone.utc),
        sequence_num=1,
    )

    _, deltas = await service.record_match(club.id, match_void)
    for d in deltas:
        assert d.rating_delta == 0.0
        assert d.dubr_delta == 0.0
        assert d.post_rating == d.pre_rating
        assert d.matches_played_after == 0

    p1_db = await test_session.get(RosterPlayer, p1.id)
    assert p1_db is not None
    assert p1_db.doubles_rating == 1500.0
    assert p1_db.doubles_matches_played == 0


async def test_batch_sync_in_batch_duplicates(
    test_session: AsyncSession,
    sample_club_and_night: tuple[Club, ClubNight],
    sample_players: list[RosterPlayer],
) -> None:
    """Verifies in-batch duplicate match IDs are deduplicated and counted correctly."""
    club, club_night = sample_club_and_night
    p1, p2, p3, p4 = sample_players

    service = MatchService(test_session)
    dup_id = uuid.uuid4()
    match_item = MatchRecordCreate(
        id=dup_id,
        club_night_id=club_night.id,
        court_id=1,
        discipline=DisciplineEnum.DOUBLES,
        format=MatchFormatEnum.SINGLE_21,
        team_a_player_ids=[p1.id, p2.id],
        team_b_player_ids=[p3.id, p4.id],
        team_a_scores=[21],
        team_b_scores=[17],
        recorded_at=datetime.now(timezone.utc),
        sequence_num=1,
    )

    # Batch with duplicate match
    batch_req = BatchSyncRequest(
        club_night_id=club_night.id,
        matches=[match_item, match_item],
    )

    batch_resp = await service.sync_batch(club.id, batch_req)
    assert batch_resp.synced_count == 1
    assert batch_resp.ignored_duplicates_count == 1
    assert str(dup_id) in batch_resp.deltas
    assert len(batch_resp.deltas[str(dup_id)]) == 4
