"""Health check schemas for Badminque API."""

from enum import Enum

from pydantic import BaseModel, Field


class DatabaseStatus(str, Enum):
    CONNECTED = "connected"
    DISCONNECTED = "disconnected"
    UNCONFIGURED = "unconfigured"


class HealthResponse(BaseModel):
    """Schema returned by GET /health."""

    status: str = Field(default="healthy", description="Overall service health state")
    database: DatabaseStatus = Field(
        default=DatabaseStatus.CONNECTED,
        description="Database connectivity status",
    )
    environment: str = Field(
        default="development",
        description="Current runtime environment",
    )
    version: str = Field(default="0.1.0", description="API version")
