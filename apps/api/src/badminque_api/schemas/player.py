"""Player and roster Pydantic schemas conforming to domain model and GLOSSARY.md."""

from datetime import datetime
from enum import Enum
from uuid import UUID, uuid4

from pydantic import (
    AliasChoices,
    BaseModel,
    ConfigDict,
    Field,
    computed_field,
    field_validator,
    model_validator,
)

from badminque_api.domain.rating.dubr import (
    is_provisional,
    rating_to_dubr,
    tier_to_dubr,
)


class SkillTierEnum(str, Enum):
    """Cold-start 1-tap skill tier anchor for unrated players."""

    BEGINNER = "BEGINNER"
    INTERMEDIATE = "INTERMEDIATE"
    ADVANCED = "ADVANCED"


class PlayerStateEnum(str, Enum):
    QUEUED = "QUEUED"
    PLAYING = "PLAYING"
    SKIPPED = "SKIPPED"
    RESTING = "RESTING"
    WAITING_PARTNER = "WAITING_PARTNER"


class PlayerStatusUpdate(BaseModel):
    status: PlayerStateEnum = Field(
        description="New courtside status for the roster player"
    )


class RosterPlayerBase(BaseModel):
    name: str = Field(
        min_length=1,
        max_length=255,
        description="Player full name",
        validation_alias=AliasChoices("name", "display_name"),
    )
    initial_tier: SkillTierEnum | None = Field(
        default=None,
        description="Cold-start 1-tap skill tier anchor",
    )
    singles_rating: float = Field(
        default=1500.0,
        ge=0.0,
        le=5000.0,
        description="Internal logistic singles rating",
    )
    doubles_rating: float = Field(
        default=1500.0,
        ge=0.0,
        le=5000.0,
        description="Internal logistic doubles rating",
    )

    @field_validator("name")
    @classmethod
    def validate_name_not_blank(cls, value: str) -> str:
        trimmed = value.strip()
        if not trimmed:
            raise ValueError("Player name cannot be empty or whitespace only")
        return trimmed

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
    singles_dubr: float | None = Field(
        default=None,
        ge=2.0,
        le=7.0,
        description="Optional initial singles DUBR (2.000–7.000)",
    )
    doubles_dubr: float | None = Field(
        default=None,
        ge=2.0,
        le=7.0,
        description="Optional initial doubles DUBR (2.000–7.000)",
    )

    @field_validator("singles_dubr", "doubles_dubr")
    @classmethod
    def validate_dubr_precision(cls, value: float | None) -> float | None:
        if value is not None:
            return round(value, 3)
        return None

    @model_validator(mode="after")
    def validate_tier_and_dubr_consistency(self) -> "RosterPlayerCreate":
        if self.initial_tier is not None:
            tier_expected_dubr = tier_to_dubr(self.initial_tier.value)
            if (
                self.singles_dubr is not None
                and abs(self.singles_dubr - tier_expected_dubr) > 1e-3
            ):
                raise ValueError(
                    f"Conflicting inputs: initial_tier '{self.initial_tier.value}' "
                    f"implies DUBR {tier_expected_dubr:.3f}, "
                    f"but singles_dubr is {self.singles_dubr:.3f}"
                )
            if (
                self.doubles_dubr is not None
                and abs(self.doubles_dubr - tier_expected_dubr) > 1e-3
            ):
                raise ValueError(
                    f"Conflicting inputs: initial_tier '{self.initial_tier.value}' "
                    f"implies DUBR {tier_expected_dubr:.3f}, "
                    f"but doubles_dubr is {self.doubles_dubr:.3f}"
                )
        return self


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

    @computed_field
    @property
    def singles_dubr(self) -> float:
        return round(rating_to_dubr(self.singles_rating), 3)

    @computed_field
    @property
    def doubles_dubr(self) -> float:
        return round(rating_to_dubr(self.doubles_rating), 3)

    @computed_field
    @property
    def is_provisional(self) -> bool:
        return is_provisional(self.matches_played)

    model_config = ConfigDict(from_attributes=True, populate_by_name=True)


class PlayerPassportResponse(BaseModel):
    player_id: UUID
    name: str
    singles_rating: float
    doubles_rating: float
    singles_matches_played: int
    doubles_matches_played: int
    club_name: str

    @computed_field
    @property
    def singles_dubr(self) -> float:
        return round(rating_to_dubr(self.singles_rating), 3)

    @computed_field
    @property
    def doubles_dubr(self) -> float:
        return round(rating_to_dubr(self.doubles_rating), 3)

    @computed_field
    @property
    def is_provisional(self) -> bool:
        return is_provisional(self.singles_matches_played + self.doubles_matches_played)

    model_config = ConfigDict(from_attributes=True)
