"""SQLAlchemy models for Club and Club Night."""

import uuid
from datetime import date, datetime
from typing import TYPE_CHECKING

from sqlalchemy import Date, DateTime, ForeignKey, String, func
from sqlalchemy.dialects.postgresql import UUID as PG_UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from badminque_api.models.base import Base

if TYPE_CHECKING:
    from badminque_api.models.match import MatchRecord
    from badminque_api.models.player import RosterPlayer


class Club(Base):
    __tablename__ = "clubs"

    id: Mapped[uuid.UUID] = mapped_column(
        PG_UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )

    club_nights: Mapped[list["ClubNight"]] = relationship(
        "ClubNight", back_populates="club", cascade="all, delete-orphan"
    )
    roster_players: Mapped[list["RosterPlayer"]] = relationship(
        "RosterPlayer", back_populates="club", cascade="all, delete-orphan"
    )


class ClubNight(Base):
    __tablename__ = "club_nights"

    id: Mapped[uuid.UUID] = mapped_column(
        PG_UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    club_id: Mapped[uuid.UUID] = mapped_column(
        PG_UUID(as_uuid=True),
        ForeignKey("clubs.id", ondelete="CASCADE"),
        nullable=False,
    )
    date: Mapped[date] = mapped_column(Date, nullable=False)
    status: Mapped[str] = mapped_column(String(32), default="ACTIVE", nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )

    club: Mapped["Club"] = relationship("Club", back_populates="club_nights")
    matches: Mapped[list["MatchRecord"]] = relationship(
        "MatchRecord", back_populates="club_night", cascade="all, delete-orphan"
    )
