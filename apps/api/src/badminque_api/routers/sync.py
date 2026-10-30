"""FastAPI router for offline batch synchronization.

Strictly adheres to GLOSSARY.md, ADR 0001, and CODING_STANDARDS.md.
"""

import uuid

from fastapi import APIRouter, status

from badminque_api.database import DbSession
from badminque_api.exceptions import EntityNotFoundError
from badminque_api.models.club import ClubNight
from badminque_api.schemas.sync import BatchSyncRequest, BatchSyncResponse
from badminque_api.services.match_service import MatchService

router = APIRouter(tags=["Sync"])


@router.post(
    "/sync/batch",
    response_model=BatchSyncResponse,
    status_code=status.HTTP_200_OK,
    summary="Synchronize an offline batch of recorded matches",
)
async def sync_batch(
    payload: BatchSyncRequest,
    session: DbSession,
) -> BatchSyncResponse:
    """Synchronize an offline batch of matches chronologically."""
    night = await session.get(ClubNight, payload.club_night_id)
    if night is None:
        raise EntityNotFoundError(f"Club night {payload.club_night_id} not found")

    service = MatchService(session)
    return await service.sync_batch(night.club_id, payload)


@router.post(
    "/clubs/{club_id}/sync/batch",
    response_model=BatchSyncResponse,
    status_code=status.HTTP_200_OK,
    summary="Synchronize an offline batch of recorded matches for a club",
)
async def sync_batch_for_club(
    club_id: uuid.UUID,
    payload: BatchSyncRequest,
    session: DbSession,
) -> BatchSyncResponse:
    """Synchronize an offline batch of matches for a specific club."""
    service = MatchService(session)
    return await service.sync_batch(club_id, payload)
