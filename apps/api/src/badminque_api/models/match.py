"""SQLAlchemy model for MatchRecord with client-generated UUID."""

import uuid
from datetime import datetime
from typing import TYPE_CHECKING

from sqlalchemy import JSON, DateTime, ForeignKey, Index, Integer, String, func
from sqlalchemy.dialects.postgresql import UUID as PG_UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from badminque_api.models.base import Base

if TYPE_CHECKING:
    from badminque_api.models.club import ClubNight


class MatchRecord(Base):
    __tablename__ = "matches"

    id: Mapped[uuid.UUID] = mapped_column(PG_UUID(as_uuid=True), primary_key=True)
    club_night_id: Mapped[uuid.UUID] = mapped_column(
        PG_UUID(as_uuid=True),
        ForeignKey("club_nights.id", ondelete="CASCADE"),
        nullable=False,
    )
    court_id: Mapped[int] = mapped_column(Integer, nullable=False)
    discipline: Mapped[str] = mapped_column(String(16), nullable=False)
    format: Mapped[str] = mapped_column(String(16), nullable=False)
    team_a_player_ids: Mapped[list[str]] = mapped_column(JSON, nullable=False)
    team_b_player_ids: Mapped[list[str]] = mapped_column(JSON, nullable=False)
    team_a_scores: Mapped[list[int]] = mapped_column(JSON, nullable=False)
    team_b_scores: Mapped[list[int]] = mapped_column(JSON, nullable=False)
    recorded_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False
    )
    sequence_num: Mapped[int] = mapped_column(Integer, nullable=False)
    status: Mapped[str] = mapped_column(String(16), default="SYNCED", nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )

    club_night: Mapped["ClubNight"] = relationship(
        "ClubNight", back_populates="matches"
    )

    __table_args__ = (
        Index(
            "ix_matches_chronological",
            "club_night_id",
            "recorded_at",
            "sequence_num",
        ),
    )
