"""Tests for match recording FastAPI endpoints.

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


def test_post_match_recording_success(
    client_with_db: TestClient,
    sample_club_and_night: tuple[Club, ClubNight],
    sample_players: list[RosterPlayer],
) -> None:
    """Verifies POST /clubs/{id}/matches records match and returns DUBR deltas."""
    club, club_night = sample_club_and_night
    p1, p2, p3, p4 = sample_players

    payload = {
        "id": str(uuid.uuid4()),
        "club_night_id": str(club_night.id),
        "court_id": 1,
        "discipline": DisciplineEnum.DOUBLES.value,
        "format": MatchFormatEnum.SINGLE_21.value,
        "team_a_player_ids": [str(p1.id), str(p2.id)],
        "team_b_player_ids": [str(p3.id), str(p4.id)],
        "team_a_scores": [21],
        "team_b_scores": [19],
        "recorded_at": datetime.now(timezone.utc).isoformat(),
        "sequence_num": 1,
    }

    response = client_with_db.post(f"/api/v1/clubs/{club.id}/matches", json=payload)
    assert response.status_code == 201

    data = response.json()
    assert "match" in data
    assert "deltas" in data
    assert len(data["deltas"]) == 4

    delta_a1 = next(d for d in data["deltas"] if d["player_id"] == str(p1.id))
    assert delta_a1["rating_delta"] > 0
    assert delta_a1["dubr_delta"] > 0
    assert delta_a1["post_dubr"] > delta_a1["pre_dubr"]
    assert delta_a1["is_provisional"] is True
    assert delta_a1["player_name"] == "Alice"


def test_post_match_recording_invalid_scores(
    client_with_db: TestClient,
    sample_club_and_night: tuple[Club, ClubNight],
    sample_players: list[RosterPlayer],
) -> None:
    """Rejects match recording with out-of-bound scores (> 30)."""
    club, club_night = sample_club_and_night
    p1, p2, p3, p4 = sample_players

    payload = {
        "id": str(uuid.uuid4()),
        "club_night_id": str(club_night.id),
        "court_id": 1,
        "discipline": DisciplineEnum.DOUBLES.value,
        "format": MatchFormatEnum.SINGLE_21.value,
        "team_a_player_ids": [str(p1.id), str(p2.id)],
        "team_b_player_ids": [str(p3.id), str(p4.id)],
        "team_a_scores": [35],
        "team_b_scores": [19],
        "recorded_at": datetime.now(timezone.utc).isoformat(),
        "sequence_num": 1,
    }

    response = client_with_db.post(f"/api/v1/clubs/{club.id}/matches", json=payload)
    assert response.status_code == 422


def test_post_match_recording_singles_success(
    client_with_db: TestClient,
    sample_club_and_night: tuple[Club, ClubNight],
    sample_players: list[RosterPlayer],
) -> None:
    """Verifies POST /clubs/{id}/matches successfully records a singles match."""
    club, club_night = sample_club_and_night
    p1, p2, _, _ = sample_players

    payload = {
        "id": str(uuid.uuid4()),
        "club_night_id": str(club_night.id),
        "court_id": 2,
        "discipline": DisciplineEnum.SINGLES.value,
        "format": MatchFormatEnum.SINGLE_21.value,
        "team_a_player_ids": [str(p1.id)],
        "team_b_player_ids": [str(p2.id)],
        "team_a_scores": [21],
        "team_b_scores": [15],
        "recorded_at": datetime.now(timezone.utc).isoformat(),
        "sequence_num": 1,
    }

    response = client_with_db.post(f"/api/v1/clubs/{club.id}/matches", json=payload)
    assert response.status_code == 201

    data = response.json()
    assert len(data["deltas"]) == 2
    delta_a = next(d for d in data["deltas"] if d["player_id"] == str(p1.id))
    assert delta_a["rating_delta"] > 0
    assert delta_a["dubr_delta"] > 0


def test_post_match_recording_rejects_tied_set(
    client_with_db: TestClient,
    sample_club_and_night: tuple[Club, ClubNight],
    sample_players: list[RosterPlayer],
) -> None:
    """Rejects match recording when a set score is tied."""
    club, club_night = sample_club_and_night
    p1, p2 = sample_players[0], sample_players[1]

    payload = {
        "id": str(uuid.uuid4()),
        "club_night_id": str(club_night.id),
        "court_id": 1,
        "discipline": DisciplineEnum.SINGLES.value,
        "format": MatchFormatEnum.SINGLE_21.value,
        "team_a_player_ids": [str(p1.id)],
        "team_b_player_ids": [str(p2.id)],
        "team_a_scores": [21],
        "team_b_scores": [21],
        "recorded_at": datetime.now(timezone.utc).isoformat(),
        "sequence_num": 1,
    }

    response = client_with_db.post(f"/api/v1/clubs/{club.id}/matches", json=payload)
    assert response.status_code == 422
