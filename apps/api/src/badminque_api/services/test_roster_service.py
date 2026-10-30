"""Tests for RosterService conforming to Tricount player lifecycle.

Tests business logic and database orchestration at the service boundary.
"""

import uuid
from collections.abc import AsyncGenerator

import pytest
from sqlalchemy.ext.asyncio import (
    AsyncSession,
    async_sessionmaker,
    create_async_engine,
)

from badminque_api.exceptions import EntityNotFoundError
from badminque_api.models import Base
from badminque_api.models.club import Club
from badminque_api.schemas.player import PlayerStateEnum, RosterPlayerCreate
from badminque_api.services.roster_service import RosterService


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
async def sample_club(test_session: AsyncSession) -> Club:
    """Creates a sample club in the database."""
    club = Club(id=uuid.uuid4(), name="Metro Badminton Club")
    test_session.add(club)
    await test_session.commit()
    await test_session.refresh(club)
    return club


async def test_create_roster_player_success(
    test_session: AsyncSession, sample_club: Club
) -> None:
    """Verifies creation of a roster player with permanent UUID and baseline rating."""
    service = RosterService(test_session)
    player_id = uuid.uuid4()
    player_data = RosterPlayerCreate(
        id=player_id,
        club_id=sample_club.id,
        name="Marcus Gideon",
    )

    player = await service.create_roster_player(sample_club.id, player_data)

    assert player.id == player_id
    assert player.club_id == sample_club.id
    assert player.name == "Marcus Gideon"
    assert player.singles_rating == 1500.0
    assert player.doubles_rating == 1500.0
    assert player.auth_user_id is None
    assert player.status == PlayerStateEnum.QUEUED.value
    assert player.matches_played == 0


async def test_create_roster_player_nonexistent_club(
    test_session: AsyncSession,
) -> None:
    """Raises EntityNotFoundError when creating a player for an unknown club."""
    service = RosterService(test_session)
    missing_club_id = uuid.uuid4()
    player_data = RosterPlayerCreate(
        id=uuid.uuid4(),
        club_id=missing_club_id,
        name="Ghost Player",
    )

    with pytest.raises(EntityNotFoundError) as exc_info:
        await service.create_roster_player(missing_club_id, player_data)
    assert "Club" in exc_info.value.detail


async def test_create_roster_player_idempotency(
    test_session: AsyncSession, sample_club: Club
) -> None:
    """Duplicate creation with identical UUID returns existing record without error."""
    service = RosterService(test_session)
    player_id = uuid.uuid4()
    player_data = RosterPlayerCreate(
        id=player_id,
        club_id=sample_club.id,
        name="Kevin Sukamuljo",
    )

    first_player = await service.create_roster_player(sample_club.id, player_data)
    second_player = await service.create_roster_player(sample_club.id, player_data)

    assert first_player.id == second_player.id
    assert second_player.name == "Kevin Sukamuljo"


async def test_list_roster_players_empty(
    test_session: AsyncSession, sample_club: Club
) -> None:
    """Returns empty list when no players exist in the club."""
    service = RosterService(test_session)
    players = await service.list_roster_players(sample_club.id)
    assert players == []


async def test_list_roster_players_prefix_search(
    test_session: AsyncSession, sample_club: Club
) -> None:
    """Filters roster players using case-insensitive prefix search."""
    service = RosterService(test_session)
    names = ["Alice Tan", "Alvin Lim", "Bob Dylan", "Charlie Watts"]
    for name in names:
        await service.create_roster_player(
            sample_club.id,
            RosterPlayerCreate(id=uuid.uuid4(), club_id=sample_club.id, name=name),
        )

    # Prefix search "al" should match Alice Tan and Alvin Lim
    results = await service.list_roster_players(sample_club.id, search_prefix="al")
    assert len(results) == 2
    matched_names = {p.name for p in results}
    assert matched_names == {"Alice Tan", "Alvin Lim"}

    # Prefix search "BOB" (case-insensitive)
    results_bob = await service.list_roster_players(sample_club.id, search_prefix="BOB")
    assert len(results_bob) == 1
    assert results_bob[0].name == "Bob Dylan"


async def test_list_roster_players_nonexistent_club(
    test_session: AsyncSession,
) -> None:
    """Raises EntityNotFoundError when listing players for a non-existent club."""
    service = RosterService(test_session)
    missing_club_id = uuid.uuid4()

    with pytest.raises(EntityNotFoundError) as exc_info:
        await service.list_roster_players(missing_club_id)
    assert "Club" in exc_info.value.detail


async def test_update_player_status(
    test_session: AsyncSession, sample_club: Club
) -> None:
    """Updates player status and raises error for non-existent player."""
    service = RosterService(test_session)
    player = await service.create_roster_player(
        sample_club.id,
        RosterPlayerCreate(
            id=uuid.uuid4(), club_id=sample_club.id, name="Hendras Setiawan"
        ),
    )

    updated = await service.update_player_status(
        sample_club.id, player.id, PlayerStateEnum.PLAYING.value
    )
    assert updated.status == PlayerStateEnum.PLAYING.value

    # Non-existent player raises EntityNotFoundError
    with pytest.raises(EntityNotFoundError):
        await service.update_player_status(
            sample_club.id, uuid.uuid4(), PlayerStateEnum.RESTING.value
        )
