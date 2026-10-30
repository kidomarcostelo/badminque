"""Tests for offline batch sync FastAPI endpoints.

Strictly follows CODING_STANDARDS.md Section 1.5 (Colocated Tests).
"""

import uuid
from collections.abc import AsyncGenerator, Generator
from datetime import date, datetime, timezone

import pytest
from fastapi.testclient import TestClient
from sqlalchemy.ext.asyncio import (
    AsyncSession,
    async_sessionmaker,
    create_async_engine,
)

from badminque_api.database import get_db_session
from badminque_api.main import app
from badminque_api.models import Base
from badminque_api.models.club import Club, ClubNight
from badminque_api.models.player import RosterPlayer
from badminque_api.schemas.match import DisciplineEnum, MatchFormatEnum


@pytest.fixture
async def router_db_session() -> AsyncGenerator[AsyncSession, None]:
    """Provides an isolated SQLite database session for router testing."""
    engine = create_async_engine(
        "sqlite+aiosqlite:///:memory:",
        echo=False,
    )
    async with engine.begin() as connection:
        await connection.run_sync(Base.metadata.create_all)

    session_maker = async_sessionmaker(
        bind=engine,
        class_=AsyncSession,
        expire_on_commit=False,
    )
    async with session_maker() as session:
        yield session

    async with engine.begin() as connection:
        await connection.run_sync(Base.metadata.drop_all)
    await engine.dispose()


@pytest.fixture
def client_with_db(
    router_db_session: AsyncSession,
) -> Generator[TestClient, None, None]:
    """TestClient with get_db_session overridden with the test database session."""

    async def override_get_db_session() -> AsyncGenerator[AsyncSession, None]:
        yield router_db_session

    app.dependency_overrides[get_db_session] = override_get_db_session
    with TestClient(app) as test_client:
        yield test_client
    app.dependency_overrides.clear()


@pytest.fixture
async def sample_club_and_night(
    router_db_session: AsyncSession,
) -> tuple[Club, ClubNight]:
    """Creates a sample club and club night in the database."""
    club = Club(id=uuid.uuid4(), name="Central Badminton Club")
    router_db_session.add(club)
    await router_db_session.flush()

    club_night = ClubNight(
        id=uuid.uuid4(),
        club_id=club.id,
        date=date.today(),
        status="ACTIVE",
    )
    router_db_session.add(club_night)
    await router_db_session.commit()
    await router_db_session.refresh(club)
    await router_db_session.refresh(club_night)
    return club, club_night


@pytest.fixture
async def sample_players(
    router_db_session: AsyncSession,
    sample_club_and_night: tuple[Club, ClubNight],
) -> list[RosterPlayer]:
    """Creates 4 roster players in the sample club."""
    club, _ = sample_club_and_night
    players = []
    for name in ["Alice", "Bob", "Charlie", "Dave"]:
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
        router_db_session.add(p)
        players.append(p)
    await router_db_session.commit()
    for p in players:
        await router_db_session.refresh(p)
    return players


def test_batch_sync_success(
    client_with_db: TestClient,
    sample_club_and_night: tuple[Club, ClubNight],
    sample_players: list[RosterPlayer],
) -> None:
    """Verifies POST /sync/batch receives offline matches and folds ratings."""
    _, club_night = sample_club_and_night
    p1, p2, p3, p4 = sample_players

    match_id = str(uuid.uuid4())
    payload = {
        "club_night_id": str(club_night.id),
        "matches": [
            {
                "id": match_id,
                "club_night_id": str(club_night.id),
                "court_id": 1,
                "discipline": DisciplineEnum.DOUBLES.value,
                "format": MatchFormatEnum.SINGLE_21.value,
                "team_a_player_ids": [str(p1.id), str(p2.id)],
                "team_b_player_ids": [str(p3.id), str(p4.id)],
                "team_a_scores": [21],
                "team_b_scores": [15],
                "recorded_at": datetime.now(timezone.utc).isoformat(),
                "sequence_num": 1,
            }
        ],
    }

    response = client_with_db.post("/api/v1/sync/batch", json=payload)
    assert response.status_code == 200

    data = response.json()
    assert data["synced_count"] == 1
    assert data["ignored_duplicates_count"] == 0
    assert data["status"] == "success"
    assert match_id in data["deltas"]
