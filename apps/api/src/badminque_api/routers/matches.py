"""FastAPI router for Match recording and DUBR rating calculations.

Strictly adheres to GLOSSARY.md, ADR 0002, and CODING_STANDARDS.md.
"""

import uuid

from fastapi import APIRouter, status

from badminque_api.database import DbSession
from badminque_api.schemas.match import (
    MatchRecordCreate,
    MatchRecordingResponse,
    MatchRecordResponse,
)
from badminque_api.services.match_service import MatchService

router = APIRouter(tags=["Matches"])


@router.post(
    "/clubs/{club_id}/matches",
    response_model=MatchRecordingResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Record match score and calculate DUBR adjustments",
)
async def record_match(
    club_id: uuid.UUID,
    match_data: MatchRecordCreate,
    session: DbSession,
) -> MatchRecordingResponse:
    """Record a completed match score and apply DUBR rating adjustments."""
    service = MatchService(session)
    match_record, deltas = await service.record_match(club_id, match_data)
    return MatchRecordingResponse(
        match=MatchRecordResponse.model_validate(match_record, from_attributes=True),
        deltas=deltas,
    )
