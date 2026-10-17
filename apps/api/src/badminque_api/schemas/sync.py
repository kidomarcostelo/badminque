"""Offline batch synchronization schemas for Badminque API.

Conforms to docs/research/sync-protocol-spec.md and ADR 0001.
"""

from uuid import UUID

from pydantic import BaseModel, Field

from badminque_api.schemas.match import MatchRecordCreate


class BatchSyncRequest(BaseModel):
    """Payload sent from offline PWA when online connectivity is restored."""

    club_night_id: UUID = Field(
        description="Club Night UUID whose matches are being synced"
    )
    matches: list[MatchRecordCreate] = Field(
        default_factory=list,
        description="List of recorded match records with client UUIDs",
    )


class BatchSyncResponse(BaseModel):
    """Response returned after idempotent batch sync fold."""

    synced_count: int = Field(ge=0, description="Number of newly inserted matches")
    ignored_duplicates_count: int = Field(
        ge=0,
        description="Number of matches ignored due to ON CONFLICT (id) DO NOTHING",
    )
    status: str = Field(default="success", description="Batch synchronization status")
