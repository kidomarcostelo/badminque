"""Pydantic v2 domain schemas."""

from badminque_api.schemas.club import (
    ClubCreate,
    ClubNightCreate,
    ClubNightResponse,
    ClubResponse,
)
from badminque_api.schemas.health import DatabaseStatus, HealthResponse
from badminque_api.schemas.match import (
    DisciplineEnum,
    MatchFormatEnum,
    MatchRecordCreate,
    MatchRecordResponse,
    SyncStatusEnum,
)
from badminque_api.schemas.player import (
    PlayerPassportResponse,
    PlayerStateEnum,
    RosterPlayerCreate,
    RosterPlayerResponse,
)
from badminque_api.schemas.sync import (
    BatchSyncRequest,
    BatchSyncResponse,
)

__all__ = [
    "ClubCreate",
    "ClubNightCreate",
    "ClubNightResponse",
    "ClubResponse",
    "DatabaseStatus",
    "HealthResponse",
    "DisciplineEnum",
    "MatchFormatEnum",
    "MatchRecordCreate",
    "MatchRecordResponse",
    "SyncStatusEnum",
    "PlayerPassportResponse",
    "PlayerStateEnum",
    "RosterPlayerCreate",
    "RosterPlayerResponse",
    "BatchSyncRequest",
    "BatchSyncResponse",
]
