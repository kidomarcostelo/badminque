"""Club and Club Night schemas for Badminque API."""

import datetime as dt
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field


class ClubBase(BaseModel):
    name: str = Field(min_length=1, max_length=255, description="Club name")


class ClubCreate(ClubBase):
    id: UUID = Field(description="Club identifier UUID")


class ClubResponse(ClubBase):
    id: UUID
    created_at: dt.datetime

    model_config = ConfigDict(from_attributes=True)


class ClubNightBase(BaseModel):
    date: dt.date = Field(description="Date of the club night")
    status: str = Field(default="ACTIVE", description="Status of the club night")


class ClubNightCreate(ClubNightBase):
    id: UUID = Field(description="Club Night session UUID")
    club_id: UUID = Field(description="Parent Club UUID")


class ClubNightResponse(ClubNightBase):
    id: UUID
    club_id: UUID
    created_at: dt.datetime

    model_config = ConfigDict(from_attributes=True)
