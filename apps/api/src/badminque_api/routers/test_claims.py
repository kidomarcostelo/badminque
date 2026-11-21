"""Tests for Tricount account claiming and Player Passport endpoints.

Strictly follows CODING_STANDARDS.md Section 1.5 (Colocated Tests).
"""

import uuid
from collections.abc import AsyncGenerator, Generator
from datetime import datetime, timezone

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
from badminque_api.models.club import Club
from badminque_api.models.player import RosterPlayer


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
    """TestClient with get_db_session overridden with test database session."""

    async def override_get_db_session() -> AsyncGenerator[AsyncSession, None]:
        yield router_db_session

    app.dependency_overrides[get_db_session] = override_get_db_session
    with TestClient(app) as test_client:
        yield test_client
    app.dependency_overrides.clear()


@pytest.fixture
async def sample_club_and_player(
    router_db_session: AsyncSession,
) -> tuple[Club, RosterPlayer]:
    """Creates a sample club and unclaimed roster player."""
    club = Club(id=uuid.uuid4(), name="Metro Badminton Club")
    router_db_session.add(club)
    await router_db_session.flush()

    player = RosterPlayer(
        id=uuid.uuid4(),
        club_id=club.id,
        name="Loh Kean Yew",
        auth_user_id=None,
        singles_rating=1550.0,
        doubles_rating=1500.0,
        singles_matches_played=3,
        doubles_matches_played=2,
        status="QUEUED",
    )
    router_db_session.add(player)
    await router_db_session.commit()
    await router_db_session.refresh(club)
    await router_db_session.refresh(player)
    return club, player


def test_generate_claim_token(
    client_with_db: TestClient,
    sample_club_and_player: tuple[Club, RosterPlayer],
) -> None:
    """Verifies that an organizer can generate a 48h claim token
    for an unclaimed player.
    """
    club, player = sample_club_and_player

    response = client_with_db.post(
        f"/api/v1/clubs/{club.id}/players/{player.id}/claim-token"
    )
    assert response.status_code == 201

    data = response.json()
    assert "token" in data
    assert len(data["token"]) >= 16
    assert data["roster_player_id"] == str(player.id)
    assert data["club_id"] == str(club.id)
    assert data["is_claimed"] is False
    assert "expires_at" in data

    # Verify expiration is approximately 48 hours in future
    expires_at = datetime.fromisoformat(data["expires_at"].replace("Z", "+00:00"))
    if expires_at.tzinfo is None:
        expires_at = expires_at.replace(tzinfo=timezone.utc)
    now = datetime.now(timezone.utc)
    diff = expires_at - now
    assert 47 <= diff.total_seconds() / 3600 <= 49


def test_claim_account_success(
    client_with_db: TestClient,
    sample_club_and_player: tuple[Club, RosterPlayer],
) -> None:
    """Verifies that a player can claim their account with a valid token."""
    club, player = sample_club_and_player

    token_res = client_with_db.post(
        f"/api/v1/clubs/{club.id}/players/{player.id}/claim-token"
    )
    assert token_res.status_code == 201
    token = token_res.json()["token"]

    auth_id = str(uuid.uuid4())
    claim_res = client_with_db.post(
        "/api/v1/claim/token",
        json={"token": token, "auth_user_id": auth_id},
    )
    assert claim_res.status_code == 200

    data = claim_res.json()
    assert data["player_id"] == str(player.id)
    assert data["auth_user_id"] == auth_id
    assert data["name"] == "Loh Kean Yew"


def test_claim_account_single_use_enforced(
    client_with_db: TestClient,
    sample_club_and_player: tuple[Club, RosterPlayer],
) -> None:
    """Verifies that a claim token cannot be used more than once."""
    club, player = sample_club_and_player

    token_res = client_with_db.post(
        f"/api/v1/clubs/{club.id}/players/{player.id}/claim-token"
    )
    token = token_res.json()["token"]

    auth_id_1 = str(uuid.uuid4())
    claim_1 = client_with_db.post(
        "/api/v1/claim/token",
        json={"token": token, "auth_user_id": auth_id_1},
    )
    assert claim_1.status_code == 200

    # Second claim attempt with same token must fail
    auth_id_2 = str(uuid.uuid4())
    claim_2 = client_with_db.post(
        "/api/v1/claim/token",
        json={"token": token, "auth_user_id": auth_id_2},
    )
    assert claim_2.status_code in (409, 422)


def test_get_player_passport(
    client_with_db: TestClient,
    sample_club_and_player: tuple[Club, RosterPlayer],
) -> None:
    """Verifies that GET /players/{id}/passport returns ratings and identity."""
    _, player = sample_club_and_player

    response = client_with_db.get(f"/api/v1/players/{player.id}/passport")
    assert response.status_code == 200

    data = response.json()
    assert data["player_id"] == str(player.id)
    assert data["name"] == "Loh Kean Yew"
    assert data["singles_rating"] == 1550.0
    assert data["doubles_rating"] == 1500.0
    assert "singles_dubr" in data
    assert "doubles_dubr" in data
    assert data["is_provisional"] is True
    assert data["total_matches_played"] == 5
    assert "singles_is_provisional" in data
    assert "doubles_is_provisional" in data


def test_get_player_passport_cross_discipline_seeding(
    client_with_db: TestClient,
    router_db_session: AsyncSession,
) -> None:
    """Passport for established doubles player indicates seeded singles baseline."""
    club = Club(id=uuid.uuid4(), name="Seeding Club")
    router_db_session.add(club)

    player = RosterPlayer(
        id=uuid.uuid4(),
        club_id=club.id,
        name="Established Doubles Star",
        doubles_rating=1800.0,
        doubles_matches_played=12,
        singles_rating=1500.0,
        singles_matches_played=0,
    )
    router_db_session.add(player)

    import asyncio

    asyncio.run(router_db_session.commit())

    response = client_with_db.get(f"/api/v1/players/{player.id}/passport")
    assert response.status_code == 200
    data = response.json()

    assert data["doubles_matches_played"] == 12
    assert data["doubles_is_provisional"] is False
    assert data["doubles_is_seeded"] is False

    # Singles has 0 matches, but baseline is seeded from doubles prior
    assert data["singles_matches_played"] == 0
    assert data["singles_is_provisional"] is True
    assert data["singles_is_seeded"] is True
    assert data["singles_rating"] == 1800.0
    assert data["singles_dubr"] == 4.500


@pytest.fixture
async def sample_leaderboard_data(
    router_db_session: AsyncSession,
) -> tuple[Club, list[RosterPlayer]]:
    """Creates a sample club and players for leaderboard testing."""
    club = Club(id=uuid.uuid4(), name="Leaderboard Club")
    router_db_session.add(club)
    await router_db_session.flush()

    p1 = RosterPlayer(
        id=uuid.uuid4(),
        club_id=club.id,
        name="Chou Tien Chen",
        doubles_rating=1650.0,
        doubles_matches_played=10,
        singles_rating=1500.0,
        singles_matches_played=0,
    )
    p2 = RosterPlayer(
        id=uuid.uuid4(),
        club_id=club.id,
        name="Viktor Axelsen",
        doubles_rating=1750.0,
        doubles_matches_played=15,
        singles_rating=1500.0,
        singles_matches_played=0,
    )
    p3 = RosterPlayer(
        id=uuid.uuid4(),
        club_id=club.id,
        name="Provisional Player",
        doubles_rating=1800.0,
        doubles_matches_played=2,  # Provisional (< 8)
        singles_rating=1500.0,
        singles_matches_played=0,
    )
    router_db_session.add_all([p1, p2, p3])
    await router_db_session.commit()
    return club, [p1, p2, p3]


def test_get_club_leaderboard_window_ranking(
    client_with_db: TestClient,
    sample_leaderboard_data: tuple[Club, list[RosterPlayer]],
) -> None:
    """Verifies that club leaderboard computes SQL window rankings accurately."""
    club, _ = sample_leaderboard_data

    response = client_with_db.get(f"/api/v1/clubs/{club.id}/leaderboard")
    assert response.status_code == 200

    data = response.json()
    assert len(data) == 2
    assert data[0]["name"] == "Viktor Axelsen"
    assert data[0]["rank"] == 1
    assert data[0]["rating"] == 1750.0

    assert data[1]["name"] == "Chou Tien Chen"
    assert data[1]["rank"] == 2
    assert data[1]["rating"] == 1650.0


def test_get_club_leaderboard_includes_provisional(
    client_with_db: TestClient,
    sample_leaderboard_data: tuple[Club, list[RosterPlayer]],
) -> None:
    """Verifies that leaderboard includes provisional players when
    include_provisional=true.
    """
    club, _ = sample_leaderboard_data

    response = client_with_db.get(
        f"/api/v1/clubs/{club.id}/leaderboard?include_provisional=true"
    )
    assert response.status_code == 200

    data = response.json()
    assert len(data) == 3
    assert data[0]["name"] == "Provisional Player"
    assert data[0]["rank"] == 1
    assert data[0]["is_provisional"] is True


def test_get_club_leaderboard_tied_window_ranking(
    client_with_db: TestClient,
    router_db_session: AsyncSession,
) -> None:
    """Verifies that club leaderboard handles tied ratings with SQL RANK()
    window semantics (e.g. 1, 1, 3).
    """
    club = Club(id=uuid.uuid4(), name="Tied Club")
    router_db_session.add(club)

    p1 = RosterPlayer(
        id=uuid.uuid4(),
        club_id=club.id,
        name="Tied Alpha",
        doubles_rating=1700.0,
        doubles_matches_played=10,
        singles_rating=1500.0,
        singles_matches_played=0,
    )
    p2 = RosterPlayer(
        id=uuid.uuid4(),
        club_id=club.id,
        name="Tied Beta",
        doubles_rating=1700.0,
        doubles_matches_played=12,
        singles_rating=1500.0,
        singles_matches_played=0,
    )
    p3 = RosterPlayer(
        id=uuid.uuid4(),
        club_id=club.id,
        name="Third Place",
        doubles_rating=1600.0,
        doubles_matches_played=8,
        singles_rating=1500.0,
        singles_matches_played=0,
    )
    p_provisional = RosterPlayer(
        id=uuid.uuid4(),
        club_id=club.id,
        name="High Rating Rookie",
        doubles_rating=1900.0,
        doubles_matches_played=3,  # Excluded
        singles_rating=1500.0,
        singles_matches_played=0,
    )
    router_db_session.add_all([p1, p2, p3, p_provisional])

    import asyncio

    asyncio.run(router_db_session.commit())

    response = client_with_db.get(f"/api/v1/clubs/{club.id}/leaderboard")
    assert response.status_code == 200

    data = response.json()
    # High Rating Rookie must be excluded
    assert len(data) == 3
    assert not any(p["name"] == "High Rating Rookie" for p in data)

    # First two players tie for rank 1 and sort deterministically alphabetically
    assert data[0]["rank"] == 1
    assert data[0]["name"] == "Tied Alpha"
    assert data[0]["rating"] == 1700.0
    assert data[1]["rank"] == 1
    assert data[1]["name"] == "Tied Beta"
    assert data[1]["rating"] == 1700.0

    # Third player receives rank 3 (skips 2)
    assert data[2]["rank"] == 3
    assert data[2]["name"] == "Third Place"
    assert data[2]["rating"] == 1600.0
