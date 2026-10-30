"""Match schemas with strict domain validation for Badminque API.

Conforms to CODING_STANDARDS.md Section 3.3 and ADR 0001.
"""

from datetime import datetime
from enum import Enum
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field, model_validator


class DisciplineEnum(str, Enum):
    SINGLES = "SINGLES"
    DOUBLES = "DOUBLES"


class MatchFormatEnum(str, Enum):
    SINGLE_21 = "SINGLE_21"
    BEST_OF_3 = "BEST_OF_3"
    SINGLE_30 = "SINGLE_30"


class SyncStatusEnum(str, Enum):
    PENDING = "PENDING"
    SYNCING = "SYNCING"
    SYNCED = "SYNCED"


# Game score limits per CODING_STANDARDS.md
MIN_SCORE = 0
MAX_SET_SCORE = 30


class MatchRecordBase(BaseModel):
    court_id: int = Field(
        ge=1,
        description="Physical court station number (e.g. 1, 2, 3)",
    )
    discipline: DisciplineEnum = Field(description="SINGLES or DOUBLES")
    format: MatchFormatEnum = Field(
        default=MatchFormatEnum.SINGLE_30,
        description="Match scoring format",
    )
    team_a_player_ids: list[UUID] = Field(description="Team A player UUIDs")
    team_b_player_ids: list[UUID] = Field(description="Team B player UUIDs")
    team_a_scores: list[int] = Field(description="Team A scores per set")
    team_b_scores: list[int] = Field(description="Team B scores per set")

    @model_validator(mode="after")
    def validate_match_integrity(self) -> "MatchRecordBase":
        # 1. Validate team sizes based on discipline
        expected_players = 1 if self.discipline == DisciplineEnum.SINGLES else 2
        if len(self.team_a_player_ids) != expected_players:
            raise ValueError(
                f"Team A must have {expected_players} player(s) for "
                f"{self.discipline.value}"
            )
        if len(self.team_b_player_ids) != expected_players:
            raise ValueError(
                f"Team B must have {expected_players} player(s) for "
                f"{self.discipline.value}"
            )

        # 2. Validate no duplicate players
        all_players = self.team_a_player_ids + self.team_b_player_ids
        if len(set(all_players)) != len(all_players):
            raise ValueError("All player UUIDs in a match must be unique")

        # 3. Validate score lists
        if len(self.team_a_scores) != len(self.team_b_scores):
            raise ValueError("Team A and Team B must have matching score count")
        if not self.team_a_scores:
            raise ValueError("Match must have at least one completed set score")

        # 4. Validate score ranges (0 <= score <= 30)
        for score in self.team_a_scores + self.team_b_scores:
            if score < MIN_SCORE or score > MAX_SET_SCORE:
                raise ValueError(
                    f"Set score {score} is invalid: must be between "
                    f"{MIN_SCORE} and {MAX_SET_SCORE}"
                )

        # 5. Validate no individual set ends in a tie
        for sa, sb in zip(self.team_a_scores, self.team_b_scores, strict=True):
            if sa == sb:
                raise ValueError(
                    f"Individual set score cannot be tied: got ({sa}, {sb})"
                )

        # 6. Validate match sets do not end in a tie (decisive winner required)
        a_sets_won = sum(
            1
            for sa, sb in zip(self.team_a_scores, self.team_b_scores, strict=True)
            if sa > sb
        )
        b_sets_won = sum(
            1
            for sa, sb in zip(self.team_a_scores, self.team_b_scores, strict=True)
            if sb > sa
        )
        if a_sets_won == b_sets_won:
            raise ValueError(
                "Match sets cannot end in a tie; a decisive winner is required"
            )

        return self


class MatchRecordCreate(MatchRecordBase):
    id: UUID = Field(description="Client-generated UUID v4")
    club_night_id: UUID = Field(description="Parent Club Night UUID")
    recorded_at: datetime = Field(
        description="Timestamp when match was recorded courtside"
    )
    sequence_num: int = Field(
        ge=0,
        description="Sequential ordering number within the club night",
    )


class MatchRecordResponse(MatchRecordBase):
    id: UUID
    club_night_id: UUID
    recorded_at: datetime
    sequence_num: int
    status: SyncStatusEnum = Field(default=SyncStatusEnum.SYNCED)
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class PlayerRatingDeltaResponse(BaseModel):
    player_id: UUID
    player_name: str = Field(default="", description="Roster player display name")
    pre_rating: float = Field(description="Rating before match")
    post_rating: float = Field(description="Rating after match")
    rating_delta: float = Field(description="Delta R rating adjustment")
    pre_dubr: float = Field(description="DUBR before match (2.000-7.000)")
    post_dubr: float = Field(description="DUBR after match (2.000-7.000)")
    dubr_delta: float = Field(description="Delta DUBR adjustment")
    k_factor: float = Field(description="Applied K-factor")
    rd_after: float = Field(description="Rating deviation after match")
    is_provisional: bool = Field(
        description="True if player is provisional (<8 matches)"
    )
    matches_played_after: int = Field(
        description="Total matches played in discipline after match"
    )

    model_config = ConfigDict(from_attributes=True)


class MatchRecordingResponse(BaseModel):
    match: MatchRecordResponse
    deltas: list[PlayerRatingDeltaResponse]

    model_config = ConfigDict(from_attributes=True)
