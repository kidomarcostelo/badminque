"""Player and roster Pydantic schemas conforming to domain model and GLOSSARY.md."""

from datetime import datetime
from enum import Enum
from uuid import UUID, uuid4

from pydantic import AliasChoices, BaseModel, ConfigDict, Field, computed_field


class PlayerStateEnum(str, Enum):
    QUEUED = "QUEUED"
    PLAYING = "PLAYING"
    SKIPPED = "SKIPPED"
    RESTING = "RESTING"
    WAITING_PARTNER = "WAITING_PARTNER"


class RosterPlayerBase(BaseModel):
    name: str = Field(
        min_length=1,
        max_length=255,
        description="Player full name",
        validation_alias=AliasChoices("name", "display_name"),
    )
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

    model_config = ConfigDict(populate_by_name=True)


class RosterPlayerCreate(RosterPlayerBase):
    id: UUID = Field(
        default_factory=uuid4,
        description="Client-generated permanent UUID v4",
    )
    club_id: UUID | None = Field(
        default=None,
        description="Club identifier",
    )
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

    @computed_field
    @property
    def display_name(self) -> str:
        return self.name

    model_config = ConfigDict(from_attributes=True, populate_by_name=True)


class PlayerPassportResponse(BaseModel):
    player_id: UUID
    name: str
    singles_rating: float
    doubles_rating: float
    singles_matches_played: int
    doubles_matches_played: int
    club_name: str

    model_config = ConfigDict(from_attributes=True)
