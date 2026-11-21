"""SQLAlchemy models for RosterPlayer and ClaimToken.

Conforms strictly to Tricount player lifecycle.
"""

import uuid
from datetime import datetime
from typing import TYPE_CHECKING

from sqlalchemy import Boolean, DateTime, Float, ForeignKey, Integer, String, func
from sqlalchemy.dialects.postgresql import UUID as PG_UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from badminque_api.domain.rating.dubr import is_provisional, rating_to_dubr
from badminque_api.models.base import Base

if TYPE_CHECKING:
    from badminque_api.models.club import Club


class RosterPlayer(Base):
    __tablename__ = "roster_players"

    id: Mapped[uuid.UUID] = mapped_column(
        PG_UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    club_id: Mapped[uuid.UUID] = mapped_column(
        PG_UUID(as_uuid=True),
        ForeignKey("clubs.id", ondelete="CASCADE"),
        nullable=False,
    )
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    auth_user_id: Mapped[uuid.UUID | None] = mapped_column(
        PG_UUID(as_uuid=True), nullable=True
    )
    initial_tier: Mapped[str | None] = mapped_column(String(32), nullable=True)
    singles_rating: Mapped[float] = mapped_column(Float, default=1500.0, nullable=False)
    doubles_rating: Mapped[float] = mapped_column(Float, default=1500.0, nullable=False)
    singles_matches_played: Mapped[int] = mapped_column(
        Integer, default=0, nullable=False
    )
    doubles_matches_played: Mapped[int] = mapped_column(
        Integer, default=0, nullable=False
    )
    status: Mapped[str] = mapped_column(String(32), default="QUEUED", nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )

    club: Mapped["Club"] = relationship("Club", back_populates="roster_players")
    claim_tokens: Mapped[list["ClaimToken"]] = relationship(
        "ClaimToken", back_populates="roster_player", cascade="all, delete-orphan"
    )

    @property
    def matches_played(self) -> int:
        return self.singles_matches_played + self.doubles_matches_played

    @property
    def display_name(self) -> str:
        return self.name

    @property
    def effective_singles_rating(self) -> float:
        """Effective singles rating with cross-discipline prior seeding if unrated."""
        if self.singles_matches_played == 0 and self.doubles_matches_played >= 8:
            return self.doubles_rating
        return self.singles_rating

    @property
    def effective_doubles_rating(self) -> float:
        """Effective doubles rating with cross-discipline prior seeding if unrated."""
        if self.doubles_matches_played == 0 and self.singles_matches_played >= 8:
            return self.singles_rating
        return self.doubles_rating

    @property
    def singles_is_seeded(self) -> bool:
        """True if unrated singles starting baseline seeds from established doubles."""
        return self.singles_matches_played == 0 and self.doubles_matches_played >= 8

    @property
    def doubles_is_seeded(self) -> bool:
        """True if unrated doubles starting baseline seeds from established singles."""
        return self.doubles_matches_played == 0 and self.singles_matches_played >= 8

    @property
    def singles_is_provisional(self) -> bool:
        """True if player has completed fewer than 8 singles matches."""
        return is_provisional(self.singles_matches_played)

    @property
    def doubles_is_provisional(self) -> bool:
        """True if player has completed fewer than 8 doubles matches."""
        return is_provisional(self.doubles_matches_played)

    @property
    def singles_dubr(self) -> float:
        return round(rating_to_dubr(self.effective_singles_rating), 3)

    @property
    def doubles_dubr(self) -> float:
        return round(rating_to_dubr(self.effective_doubles_rating), 3)

    @property
    def is_provisional(self) -> bool:
        return is_provisional(self.matches_played)


class ClaimToken(Base):
    __tablename__ = "claim_tokens"

    token: Mapped[str] = mapped_column(String(64), primary_key=True)
    roster_player_id: Mapped[uuid.UUID] = mapped_column(
        PG_UUID(as_uuid=True),
        ForeignKey("roster_players.id", ondelete="CASCADE"),
        nullable=False,
    )
    club_id: Mapped[uuid.UUID] = mapped_column(
        PG_UUID(as_uuid=True),
        ForeignKey("clubs.id", ondelete="CASCADE"),
        nullable=False,
    )
    expires_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False
    )
    is_claimed: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )

    roster_player: Mapped["RosterPlayer"] = relationship(
        "RosterPlayer", back_populates="claim_tokens"
    )
