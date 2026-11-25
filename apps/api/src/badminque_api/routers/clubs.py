"""FastAPI router for Club and Club Night session management."""

import uuid

from fastapi import APIRouter, status

from badminque_api.database import DbSession
from badminque_api.schemas.club import (
    ClubCreate,
    ClubNightCreate,
    ClubNightResponse,
    ClubResponse,
)
from badminque_api.services.club_service import ClubService

router = APIRouter(tags=["Clubs & Club Nights"])


@router.post(
    "/clubs",
    response_model=ClubResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Create or retrieve a Club idempotently",
)
async def create_club(
    payload: ClubCreate,
    session: DbSession,
) -> ClubResponse:
    """Register a Club with a permanent UUID or return existing record."""
    service = ClubService(session)
    club = await service.create_or_get_club(payload)
    return ClubResponse.model_validate(club, from_attributes=True)


@router.get(
    "/clubs",
    response_model=list[ClubResponse],
    status_code=status.HTTP_200_OK,
    summary="List registered Clubs",
)
async def list_clubs(session: DbSession) -> list[ClubResponse]:
    """List Clubs available for Organizer session selection."""
    service = ClubService(session)
    clubs = await service.list_clubs()
    return [ClubResponse.model_validate(c, from_attributes=True) for c in clubs]


@router.post(
    "/clubs/{club_id}/nights",
    response_model=ClubNightResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Create or retrieve a Club Night session idempotently",
)
async def create_club_night(
    club_id: uuid.UUID,
    payload: ClubNightCreate,
    session: DbSession,
) -> ClubNightResponse:
    """Create a Club Night under the given Club UUID."""
    service = ClubService(session)
    night = await service.create_or_get_club_night(club_id, payload)
    return ClubNightResponse.model_validate(night, from_attributes=True)


@router.get(
    "/clubs/{club_id}/nights",
    response_model=list[ClubNightResponse],
    status_code=status.HTTP_200_OK,
    summary="List Club Nights for a Club",
)
async def list_club_nights(
    club_id: uuid.UUID,
    session: DbSession,
) -> list[ClubNightResponse]:
    """List Club Night sessions belonging to the requested Club."""
    service = ClubService(session)
    nights = await service.list_club_nights(club_id)
    return [ClubNightResponse.model_validate(n, from_attributes=True) for n in nights]
