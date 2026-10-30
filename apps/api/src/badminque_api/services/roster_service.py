"""RosterService orchestrating roster player lifecycle and persistence.

Strictly adheres to GLOSSARY.md, ADR 0001, and CODING_STANDARDS.md.
"""

import uuid

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from badminque_api.exceptions import EntityNotFoundError
from badminque_api.models.club import Club
from badminque_api.models.player import RosterPlayer
from badminque_api.schemas.player import PlayerStateEnum, RosterPlayerCreate


class RosterService:
    """Service layer orchestrating roster player management and check-in."""

    def __init__(self, session: AsyncSession) -> None:
        self.session = session

    async def _verify_club_exists(self, club_id: uuid.UUID) -> Club:
        """Verifies club existence, raising EntityNotFoundError if missing."""
        result = await self.session.execute(select(Club).where(Club.id == club_id))
        club = result.scalar_one_or_none()
        if club is None:
            raise EntityNotFoundError("Club", str(club_id))
        return club

    async def create_roster_player(
        self,
        club_id: uuid.UUID,
        player_data: RosterPlayerCreate,
    ) -> RosterPlayer:
        """Creates a roster player under the club with idempotent retry support."""
        await self._verify_club_exists(club_id)

        player_id = player_data.id or uuid.uuid4()

        # Idempotency check: return existing record if UUID already exists
        existing_result = await self.session.execute(
            select(RosterPlayer).where(
                RosterPlayer.id == player_id,
                RosterPlayer.club_id == club_id,
            )
        )
        existing_player = existing_result.scalar_one_or_none()
        if existing_player is not None:
            return existing_player

        new_player = RosterPlayer(
            id=player_id,
            club_id=club_id,
            name=player_data.name,
            auth_user_id=player_data.auth_user_id,
            singles_rating=player_data.singles_rating,
            doubles_rating=player_data.doubles_rating,
            singles_matches_played=0,
            doubles_matches_played=0,
            status=PlayerStateEnum.QUEUED.value,
        )

        self.session.add(new_player)
        await self.session.commit()
        await self.session.refresh(new_player)
        return new_player

    async def list_roster_players(
        self,
        club_id: uuid.UUID,
        search_prefix: str | None = None,
    ) -> list[RosterPlayer]:
        """Lists roster players for a club with optional prefix search."""
        await self._verify_club_exists(club_id)

        query = select(RosterPlayer).where(RosterPlayer.club_id == club_id)

        if search_prefix:
            query = query.where(RosterPlayer.name.ilike(f"{search_prefix}%"))

        query = query.order_by(RosterPlayer.name.asc())
        result = await self.session.execute(query)
        return list(result.scalars().all())

    async def get_roster_player(
        self,
        club_id: uuid.UUID,
        player_id: uuid.UUID,
    ) -> RosterPlayer:
        """Retrieves a single roster player by ID under a club."""
        await self._verify_club_exists(club_id)

        result = await self.session.execute(
            select(RosterPlayer).where(
                RosterPlayer.id == player_id,
                RosterPlayer.club_id == club_id,
            )
        )
        player = result.scalar_one_or_none()
        if player is None:
            raise EntityNotFoundError("RosterPlayer", str(player_id))
        return player

    async def update_player_status(
        self,
        club_id: uuid.UUID,
        player_id: uuid.UUID,
        new_status: str,
    ) -> RosterPlayer:
        """Updates the courtside status of a roster player."""
        player = await self.get_roster_player(club_id, player_id)
        player.status = new_status
        await self.session.commit()
        await self.session.refresh(player)
        return player
