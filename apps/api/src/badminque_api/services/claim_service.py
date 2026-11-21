"""Service handling Tricount account claiming and Player Passport generation.

Conforms strictly to ADR 0001, GLOSSARY.md, and CODING_STANDARDS.md.
"""

import secrets
import uuid
from datetime import datetime, timedelta, timezone

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from badminque_api.domain.rating.dubr import is_provisional, rating_to_dubr
from badminque_api.exceptions import (
    DomainValidationError,
    EntityNotFoundError,
    SyncConflictError,
)
from badminque_api.models.player import ClaimToken, RosterPlayer
from badminque_api.schemas.claim import (
    ClaimAccountResponse,
    ClaimTokenResponse,
    LeaderboardEntryResponse,
    PlayerPassportResponse,
)


class ClaimService:
    """Orchestrates single-use claim tokens and passport retrieval."""

    def __init__(self, session: AsyncSession) -> None:
        self.session = session

    async def generate_claim_token(
        self,
        club_id: uuid.UUID,
        player_id: uuid.UUID,
    ) -> ClaimTokenResponse:
        """Generates a cryptographically secure 48-hour claim token for a player."""
        stmt = select(RosterPlayer).where(
            RosterPlayer.id == player_id,
            RosterPlayer.club_id == club_id,
        )
        player = (await self.session.scalars(stmt)).first()
        if player is None:
            raise EntityNotFoundError("RosterPlayer", str(player_id))

        if player.auth_user_id is not None:
            raise DomainValidationError("Player is already claimed by an account.")

        token_str = secrets.token_urlsafe(32)
        expires_at = datetime.now(timezone.utc) + timedelta(hours=48)

        token = ClaimToken(
            token=token_str,
            roster_player_id=player.id,
            club_id=club_id,
            expires_at=expires_at,
            is_claimed=False,
        )
        self.session.add(token)
        await self.session.commit()
        await self.session.refresh(token)

        claim_url = f"https://badminque.app/claim?token={token_str}"

        return ClaimTokenResponse(
            token=token.token,
            roster_player_id=token.roster_player_id,
            club_id=token.club_id,
            expires_at=token.expires_at,
            is_claimed=token.is_claimed,
            claim_url=claim_url,
        )

    async def claim_account(
        self,
        token_str: str,
        auth_user_id: uuid.UUID,
    ) -> ClaimAccountResponse:
        """Binds an auth_user_id to a player record using a single-use token."""
        stmt = select(ClaimToken).where(ClaimToken.token == token_str)
        token = (await self.session.scalars(stmt)).first()
        if token is None:
            raise EntityNotFoundError("ClaimToken", token_str)

        if token.is_claimed:
            raise SyncConflictError("This claim token has already been used.")

        # Expiration check
        now = datetime.now(timezone.utc)
        token_expires = (
            token.expires_at.replace(tzinfo=timezone.utc)
            if token.expires_at.tzinfo is None
            else token.expires_at
        )
        if token_expires < now:
            raise DomainValidationError("This claim token has expired.")

        player = await self.session.get(RosterPlayer, token.roster_player_id)
        if player is None:
            raise EntityNotFoundError("RosterPlayer", str(token.roster_player_id))

        if player.auth_user_id is not None:
            raise SyncConflictError("Player is already linked to an account.")

        player.auth_user_id = auth_user_id
        token.is_claimed = True

        await self.session.commit()
        await self.session.refresh(player)

        return ClaimAccountResponse(
            player_id=player.id,
            club_id=player.club_id,
            name=player.name,
            auth_user_id=player.auth_user_id,
            status=player.status,
        )

    async def get_player_passport(
        self,
        player_id: uuid.UUID,
    ) -> PlayerPassportResponse:
        """Fetches the universal player passport summary."""
        player = await self.session.get(RosterPlayer, player_id)
        if player is None:
            raise EntityNotFoundError("RosterPlayer", str(player_id))

        total_matches = player.singles_matches_played + player.doubles_matches_played

        return PlayerPassportResponse(
            player_id=player.id,
            club_id=player.club_id,
            name=player.name,
            auth_user_id=player.auth_user_id,
            singles_rating=player.effective_singles_rating,
            doubles_rating=player.effective_doubles_rating,
            singles_dubr=player.singles_dubr,
            doubles_dubr=player.doubles_dubr,
            singles_matches_played=player.singles_matches_played,
            doubles_matches_played=player.doubles_matches_played,
            total_matches_played=total_matches,
            is_provisional=is_provisional(total_matches),
            singles_is_provisional=player.singles_is_provisional,
            doubles_is_provisional=player.doubles_is_provisional,
            singles_is_seeded=player.singles_is_seeded,
            doubles_is_seeded=player.doubles_is_seeded,
            status=player.status,
            created_at=player.created_at,
        )

    async def get_club_leaderboard(
        self,
        club_id: uuid.UUID,
        discipline: str = "doubles",
        include_provisional: bool = False,
        limit: int = 50,
        offset: int = 0,
    ) -> list[LeaderboardEntryResponse]:
        """Retrieves club leaderboard computed via SQL RANK() window functions."""
        is_doubles = discipline.lower() == "doubles"
        rating_col = (
            RosterPlayer.doubles_rating if is_doubles else RosterPlayer.singles_rating
        )
        matches_col = (
            RosterPlayer.doubles_matches_played
            if is_doubles
            else RosterPlayer.singles_matches_played
        )

        rank_func = func.rank().over(order_by=rating_col.desc()).label("rank")

        stmt = select(RosterPlayer, rank_func).where(RosterPlayer.club_id == club_id)

        if not include_provisional:
            stmt = stmt.where(matches_col >= 8)

        stmt = stmt.order_by(rating_col.desc()).limit(limit).offset(offset)
        rows = (await self.session.execute(stmt)).all()

        entries: list[LeaderboardEntryResponse] = []
        for player, rank in rows:
            rating = (
                player.doubles_rating if is_doubles else player.singles_rating
            )
            matches = (
                player.doubles_matches_played
                if is_doubles
                else player.singles_matches_played
            )
            entries.append(
                LeaderboardEntryResponse(
                    rank=rank,
                    player_id=player.id,
                    name=player.name,
                    auth_user_id=player.auth_user_id,
                    rating=rating,
                    dubr=round(rating_to_dubr(rating), 3),
                    matches_played=matches,
                    is_provisional=is_provisional(matches),
                    is_claimed=player.auth_user_id is not None,
                )
            )
        return entries

