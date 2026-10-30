"""Tests for Roster Player FastAPI endpoints.

Strictly follows CODING_STANDARDS.md Section 1.5 (Colocated Tests).
"""

import uuid
from collections.abc import AsyncGenerator, Generator

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
async def sample_club(router_db_session: AsyncSession) -> Club:
    """Inserts a club to test player check-in endpoints against."""
    club = Club(id=uuid.uuid4(), name="PB Djarum")
    router_db_session.add(club)
    await router_db_session.commit()
    await router_db_session.refresh(club)
    return club


def test_create_roster_player_endpoint(
    client_with_db: TestClient, sample_club: Club
) -> None:
    """Acceptance criteria: POST /api/v1/clubs/{id}/players creates player."""
    player_id = str(uuid.uuid4())
    payload = {
        "id": player_id,
        "name": "Mohammad Ahsan",
        "singles_rating": 1500.0,
        "doubles_rating": 1500.0,
    }

    response = client_with_db.post(
        f"/api/v1/clubs/{sample_club.id}/players",
        json=payload,
    )
    assert response.status_code == 201
    data = response.json()
    assert data["id"] == player_id
    assert data["club_id"] == str(sample_club.id)
    assert data["name"] == "Mohammad Ahsan"
    assert data["display_name"] == "Mohammad Ahsan"
    assert data["status"] == "QUEUED"
    assert data["matches_played"] == 0
    assert data["auth_user_id"] is None


def test_create_roster_player_with_display_name_alias(
    client_with_db: TestClient, sample_club: Club
) -> None:
    """Acceptance criteria: display_name alias is accepted in place of name."""
    player_id = str(uuid.uuid4())
    payload = {
        "id": player_id,
        "display_name": "Fajar Alfian",
    }

    response = client_with_db.post(
        f"/api/v1/clubs/{sample_club.id}/players",
        json=payload,
    )
    assert response.status_code == 201
    data = response.json()
    assert data["name"] == "Fajar Alfian"
    assert data["display_name"] == "Fajar Alfian"


def test_create_roster_player_nonexistent_club(
    client_with_db: TestClient,
) -> None:
    """POST /api/v1/clubs/{id}/players returns 404 for missing club."""
    missing_club_id = uuid.uuid4()
    payload = {
        "id": str(uuid.uuid4()),
        "name": "Chou Tien Chen",
    }

    response = client_with_db.post(
        f"/api/v1/clubs/{missing_club_id}/players",
        json=payload,
    )
    assert response.status_code == 404
    data = response.json()
    assert data["title"] == "Club Not Found"
    assert data["status"] == 404


def test_get_roster_players_endpoint_empty(
    client_with_db: TestClient, sample_club: Club
) -> None:
    """GET /api/v1/clubs/{id}/players returns empty list when no players enrolled."""
    response = client_with_db.get(f"/api/v1/clubs/{sample_club.id}/players")
    assert response.status_code == 200
    assert response.json() == []


def test_get_roster_players_endpoint_with_search(
    client_with_db: TestClient, sample_club: Club
) -> None:
    """Acceptance criteria: typeahead prefix filter via search param."""
    players = ["Viktor Axelsen", "Victor Lai", "Anders Antonsen", "Kento Momota"]
    for name in players:
        client_with_db.post(
            f"/api/v1/clubs/{sample_club.id}/players",
            json={"name": name},
        )

    # Prefix search for "vi" (case-insensitive)
    search_response = client_with_db.get(
        f"/api/v1/clubs/{sample_club.id}/players?search=vi"
    )
    assert search_response.status_code == 200
    matched = search_response.json()
    assert len(matched) == 2
    matched_names = {p["name"] for p in matched}
    assert matched_names == {"Viktor Axelsen", "Victor Lai"}

    # Full list without search
    all_response = client_with_db.get(f"/api/v1/clubs/{sample_club.id}/players")
    assert all_response.status_code == 200
    assert len(all_response.json()) == 4
