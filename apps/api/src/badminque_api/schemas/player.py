"""Player and roster Pydantic schemas conforming to domain model and GLOSSARY.md."""

from datetime import datetime
from enum import Enum
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field


class PlayerStateEnum(str, Enum):
    QUEUED = "QUEUED"
    PLAYING = "PLAYING"
    SKIPPED = "SKIPPED"
    RESTING = "RESTING"
    WAITING_PARTNER = "WAITING_PARTNER"


class RosterPlayerBase(BaseModel):
    name: str = Field(min_length=1, max_length=255, description="Player full name")
    singles_rating: float = Field(
        default=1500.0,
        ge=0.0,
        le=5000.0,
        description="Elo/UBR singles rating",
    )
    doubles_rating: float = Field(
        default=1500.0,
        ge=0.0,
        le=5000.0,
        description="Elo/UBR doubles rating",
    )


class RosterPlayerCreate(RosterPlayerBase):
    id: UUID = Field(description="Client-generated permanent UUID v4")
    club_id: UUID = Field(description="Club identifier")
    auth_user_id: UUID | None = Field(
        default=None,
        description="Associated auth user ID once claimed, otherwise NULL",
    )


class RosterPlayerResponse(RosterPlayerBase):
    id: UUID
    club_id: UUID
    auth_user_id: UUID | None = None
    matches_played: int = Field(default=0, ge=0)
    status: PlayerStateEnum = Field(default=PlayerStateEnum.QUEUED)
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class PlayerPassportResponse(BaseModel):
    player_id: UUID
    name: str
    singles_rating: float
    doubles_rating: float
    singles_matches_played: int
    doubles_matches_played: int
    club_name: str

    model_config = ConfigDict(from_attributes=True)
