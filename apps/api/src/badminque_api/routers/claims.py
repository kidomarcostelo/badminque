"""FastAPI router for Tricount account claiming and Player Passport endpoints.

Strictly follows GLOSSARY.md, ADR 0001, and CODING_STANDARDS.md.
"""

import uuid

from fastapi import APIRouter, Query, status

from badminque_api.database import DbSession
from badminque_api.schemas.claim import (
    ClaimAccountRequest,
    ClaimAccountResponse,
    ClaimTokenResponse,
    LeaderboardEntryResponse,
    PlayerPassportResponse,
)
from badminque_api.services.claim_service import ClaimService

router = APIRouter(tags=["Claims & Passport"])


@router.post(
    "/clubs/{club_id}/players/{player_id}/claim-token",
    response_model=ClaimTokenResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Generate a 48-hour claim token for a roster player",
)
async def generate_claim_token(
    club_id: uuid.UUID,
    player_id: uuid.UUID,
    session: DbSession,
) -> ClaimTokenResponse:
    """Generates a cryptographically secure, single-use claim token."""
    service = ClaimService(session)
    return await service.generate_claim_token(club_id, player_id)


@router.post(
    "/claim/token",
    response_model=ClaimAccountResponse,
    status_code=status.HTTP_200_OK,
    summary="Claim an unauthenticated roster player account",
)
async def claim_account(
    payload: ClaimAccountRequest,
    session: DbSession,
) -> ClaimAccountResponse:
    """Validates single-use token and binds auth_user_id without altering
    match records.
    """
    service = ClaimService(session)
    return await service.claim_account(payload.token, payload.auth_user_id)


@router.get(
    "/players/{player_id}/passport",
    response_model=PlayerPassportResponse,
    status_code=status.HTTP_200_OK,
    summary="Get universal Player Passport",
)
async def get_player_passport(
    player_id: uuid.UUID,
    session: DbSession,
) -> PlayerPassportResponse:
    """Returns universal player identity, ratings, DUBR, and match statistics."""
    service = ClaimService(session)
    return await service.get_player_passport(player_id)


@router.get(
    "/clubs/{club_id}/leaderboard",
    response_model=list[LeaderboardEntryResponse],
    status_code=status.HTTP_200_OK,
    summary="Get club leaderboard with SQL window rankings",
)
async def get_club_leaderboard(
    club_id: uuid.UUID,
    session: DbSession,
    discipline: str = Query("doubles", pattern="^(singles|doubles)$"),
    include_provisional: bool = False,
    limit: int = Query(50, ge=1, le=100),
    offset: int = Query(0, ge=0),
) -> list[LeaderboardEntryResponse]:
    """Retrieves club leaderboard computed via SQL RANK() window functions."""
    service = ClaimService(session)
    return await service.get_club_leaderboard(
        club_id=club_id,
        discipline=discipline,
        include_provisional=include_provisional,
        limit=limit,
        offset=offset,
    )

