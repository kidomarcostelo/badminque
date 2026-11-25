"""Club and Club Night persistence service for Badminque API.

Supports idempotent client-UUID creation for offline-first synchronization.
"""

import uuid

from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from badminque_api.exceptions import EntityNotFoundError
from badminque_api.models.club import Club, ClubNight
from badminque_api.schemas.club import ClubCreate, ClubNightCreate


class ClubService:
    """Service managing Club and Club Night lifecycle."""

    def __init__(self, session: AsyncSession) -> None:
        self.session = session

    async def create_or_get_club(self, club_data: ClubCreate) -> Club:
        """Create a Club idempotently using client-provided UUID."""
        existing = await self.session.get(Club, club_data.id)
        if existing is not None:
            return existing

        club = Club(id=club_data.id, name=club_data.name.strip())
        self.session.add(club)
        try:
            await self.session.commit()
            await self.session.refresh(club)
            return club
        except IntegrityError:
            await self.session.rollback()
            existing_after = await self.session.get(Club, club_data.id)
            if existing_after is not None:
                return existing_after
            raise

    async def list_clubs(self) -> list[Club]:
        """List all Clubs ordered newest first."""
        stmt = select(Club).order_by(Club.created_at.desc())
        return list((await self.session.scalars(stmt)).all())

    async def create_or_get_club_night(
        self, club_id: uuid.UUID, night_data: ClubNightCreate
    ) -> ClubNight:
        """Create a Club Night idempotently under a Club."""
        club = await self.session.get(Club, club_id)
        if club is None:
            raise EntityNotFoundError("Club", str(club_id))

        existing = await self.session.get(ClubNight, night_data.id)
        if existing is not None:
            return existing

        night = ClubNight(
            id=night_data.id,
            club_id=club_id,
            date=night_data.date,
            status=night_data.status,
        )
        self.session.add(night)
        try:
            await self.session.commit()
            await self.session.refresh(night)
            return night
        except IntegrityError:
            await self.session.rollback()
            existing_after = await self.session.get(ClubNight, night_data.id)
            if existing_after is not None:
                return existing_after
            raise

    async def list_club_nights(self, club_id: uuid.UUID) -> list[ClubNight]:
        """List Club Nights for a given Club ordered newest first."""
        club = await self.session.get(Club, club_id)
        if club is None:
            raise EntityNotFoundError("Club", str(club_id))

        stmt = (
            select(ClubNight)
            .where(ClubNight.club_id == club_id)
            .order_by(ClubNight.date.desc(), ClubNight.created_at.desc())
        )
        return list((await self.session.scalars(stmt)).all())
