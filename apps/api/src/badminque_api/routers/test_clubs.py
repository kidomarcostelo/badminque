"""Colocated FastAPI integration tests for Club and Club Night endpoints."""

import uuid
from collections.abc import AsyncGenerator
from datetime import date

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


@pytest.fixture
async def router_db_session() -> AsyncGenerator[AsyncSession, None]:
    """Provides an isolated in-memory SQLite session for FastAPI router tests."""
    test_engine = create_async_engine("sqlite+aiosqlite:///:memory:", echo=False)
    async with test_engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    session_maker = async_sessionmaker(
        bind=test_engine,
        class_=AsyncSession,
        expire_on_commit=False,
    )
    async with session_maker() as session:
        yield session

    async with test_engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)
    await test_engine.dispose()


@pytest.fixture
def client_with_db(router_db_session: AsyncSession) -> TestClient:
    """FastAPI TestClient overriding database dependency with isolated session."""

    async def override_get_db() -> AsyncGenerator[AsyncSession, None]:
        yield router_db_session

    app.dependency_overrides[get_db_session] = override_get_db
    with TestClient(app) as client:
        yield client
    app.dependency_overrides.clear()


def test_create_club_idempotently_and_list(client_with_db: TestClient) -> None:
    """POST /clubs creates a club and handles duplicate client UUID idempotently."""
    club_id = str(uuid.uuid4())
    payload = {"id": club_id, "name": "Metro Smashers BC"}

    create_resp = client_with_db.post("/api/v1/clubs", json=payload)
    assert create_resp.status_code == 201
    created = create_resp.json()
    assert created["id"] == club_id
    assert created["name"] == "Metro Smashers BC"

    # Re-posting same client UUID should succeed idempotently
    retry_resp = client_with_db.post("/api/v1/clubs", json=payload)
    assert retry_resp.status_code in (200, 201)
    assert retry_resp.json()["id"] == club_id

    list_resp = client_with_db.get("/api/v1/clubs")
    assert list_resp.status_code == 200
    clubs = list_resp.json()
    assert any(c["id"] == club_id and c["name"] == "Metro Smashers BC" for c in clubs)


def test_create_and_list_club_nights(client_with_db: TestClient) -> None:
    """POST and GET /clubs/{club_id}/nights manage Club Night sessions cleanly."""
    club_id = str(uuid.uuid4())
    client_with_db.post(
        "/api/v1/clubs",
        json={"id": club_id, "name": "Courtside Club"},
    )

    night_id = str(uuid.uuid4())
    night_payload = {
        "id": night_id,
        "club_id": club_id,
        "date": date(2026, 11, 25).isoformat(),
        "status": "ACTIVE",
    }

    create_night = client_with_db.post(
        f"/api/v1/clubs/{club_id}/nights",
        json=night_payload,
    )
    assert create_night.status_code == 201
    night_data = create_night.json()
    assert night_data["id"] == night_id
    assert night_data["club_id"] == club_id
    assert night_data["status"] == "ACTIVE"

    # Idempotent retry for offline-created session sync
    retry_night = client_with_db.post(
        f"/api/v1/clubs/{club_id}/nights",
        json=night_payload,
    )
    assert retry_night.status_code in (200, 201)
    assert retry_night.json()["id"] == night_id

    list_nights = client_with_db.get(f"/api/v1/clubs/{club_id}/nights")
    assert list_nights.status_code == 200
    nights = list_nights.json()
    assert len(nights) == 1
    assert nights[0]["id"] == night_id


def test_club_night_returns_404_when_club_not_found(
    client_with_db: TestClient,
) -> None:
    """Listing or creating nights under an unknown club returns 404 Problem Details."""
    missing_club = str(uuid.uuid4())
    get_resp = client_with_db.get(f"/api/v1/clubs/{missing_club}/nights")
    assert get_resp.status_code == 404

    post_resp = client_with_db.post(
        f"/api/v1/clubs/{missing_club}/nights",
        json={
            "id": str(uuid.uuid4()),
            "club_id": missing_club,
            "date": "2026-11-25",
            "status": "ACTIVE",
        },
    )
    assert post_resp.status_code == 404
