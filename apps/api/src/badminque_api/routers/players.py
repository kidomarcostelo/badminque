"""FastAPI router for Roster Player management and check-in.

Strictly adheres to GLOSSARY.md and CODING_STANDARDS.md.
"""

import uuid
from typing import Annotated

from fastapi import APIRouter, Query, status

from badminque_api.database import DbSession
from badminque_api.schemas.player import (
    PlayerStatusUpdate,
    RosterPlayerCreate,
    RosterPlayerResponse,
)
from badminque_api.services.roster_service import RosterService

router = APIRouter(tags=["Roster"])


@router.post(
    "/clubs/{club_id}/players",
    response_model=RosterPlayerResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Create or check in a roster player",
)
async def create_roster_player(
    club_id: uuid.UUID,
    player_data: RosterPlayerCreate,
    session: DbSession,
) -> RosterPlayerResponse:
    """Creates a roster player or idempotently returns existing player."""
    service = RosterService(session)
    player = await service.create_roster_player(club_id, player_data)
    return RosterPlayerResponse.model_validate(player, from_attributes=True)


@router.get(
    "/clubs/{club_id}/players",
    response_model=list[RosterPlayerResponse],
    summary="List roster players with prefix search",
)
async def list_roster_players(
    club_id: uuid.UUID,
    session: DbSession,
    search: Annotated[
        str | None,
        Query(
            description="Typeahead prefix search filter for player name",
            min_length=1,
            max_length=100,
        ),
    ] = None,
) -> list[RosterPlayerResponse]:
    """Retrieves roster players for a club with optional typeahead prefix filtering."""
    service = RosterService(session)
    players = await service.list_roster_players(club_id, search_prefix=search)
    return [
        RosterPlayerResponse.model_validate(player, from_attributes=True)
        for player in players
    ]


@router.patch(
    "/clubs/{club_id}/players/{player_id}/status",
    response_model=RosterPlayerResponse,
    summary="Update roster player status",
)
async def update_player_status(
    club_id: uuid.UUID,
    player_id: uuid.UUID,
    status_update: PlayerStatusUpdate,
    session: DbSession,
) -> RosterPlayerResponse:
    """Updates the courtside status of a roster player."""
    service = RosterService(session)
    player = await service.update_player_status(
        club_id, player_id, status_update.status.value
    )
    return RosterPlayerResponse.model_validate(player, from_attributes=True)
