"""Pydantic schemas for account claiming and Player Passport.

Conforms strictly to GLOSSARY.md, ADR 0001, and CODING_STANDARDS.md.
"""

from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, Field


class ClaimTokenResponse(BaseModel):
    """Schema returned when an organizer generates a player claim token."""

    token: str = Field(description="Cryptographically secure 48-hour single-use token")
    roster_player_id: UUID = Field(
        description="UUID of the Roster Player to be claimed"
    )
    club_id: UUID = Field(description="Club UUID owning this player")
    expires_at: datetime = Field(
        description="Expiration timestamp (48 hours after issue)"
    )
    is_claimed: bool = Field(default=False, description="Whether token has been used")
    claim_url: str = Field(description="Shareable URL or QR code payload for claiming")


class ClaimAccountRequest(BaseModel):
    """Request payload for claiming an unauthenticated Roster Player."""

    token: str = Field(description="The single-use claim token string")
    auth_user_id: UUID = Field(description="Authenticated user ID to bind to player")


class ClaimAccountResponse(BaseModel):
    """Response returned upon successful account claiming."""

    player_id: UUID = Field(description="Permanent player UUID")
    club_id: UUID = Field(description="Club UUID")
    name: str = Field(description="Player display name")
    auth_user_id: UUID = Field(description="Bound authenticated user ID")
    status: str = Field(description="Current courtside status")


class PlayerPassportResponse(BaseModel):
    """Universal badminton player identity and rating summary."""

    player_id: UUID = Field(description="Permanent UUID of the player")
    club_id: UUID = Field(description="Home club UUID")
    name: str = Field(description="Canonical display name")
    auth_user_id: UUID | None = Field(
        default=None, description="Bound account auth ID, or None if guest"
    )
    singles_rating: float = Field(description="Current singles Elo rating")
    doubles_rating: float = Field(description="Current doubles Elo rating")
    singles_dubr: float = Field(description="Singles DUBR (2.000-7.000 scale)")
    doubles_dubr: float = Field(description="Doubles DUBR (2.000-7.000 scale)")
    singles_matches_played: int = Field(ge=0, description="Singles matches played")
    doubles_matches_played: int = Field(ge=0, description="Doubles matches played")
    total_matches_played: int = Field(ge=0, description="Total matches played")
    is_provisional: bool = Field(description="True if player has played < 8 matches")
    status: str = Field(description="Current player state")
    created_at: datetime = Field(
        description="Timestamp when player profile was created"
    )


class LeaderboardEntryResponse(BaseModel):
    """Entry on a club leaderboard computed with window ranking functions."""

    rank: int = Field(ge=1, description="Leaderboard rank computed via RANK() OVER")
    player_id: UUID = Field(description="Permanent player UUID")
    name: str = Field(description="Player display name")
    auth_user_id: UUID | None = Field(
        default=None, description="Bound user account UUID, if claimed"
    )
    rating: float = Field(description="Elo rating in requested discipline")
    dubr: float = Field(description="DUBR in requested discipline")
    matches_played: int = Field(
        ge=0, description="Matches played in requested discipline"
    )
    is_provisional: bool = Field(
        description="Whether rating is provisional (<8 matches)"
    )
    is_claimed: bool = Field(
        description="Whether roster player has claimed their passport"
    )

