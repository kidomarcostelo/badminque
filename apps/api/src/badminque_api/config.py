"""Application configuration and environment settings for Badminque API.

Uses Pydantic v2 Settings to validate configuration loaded from environment variables.
"""

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Runtime configuration settings."""

    # Neon PostgreSQL database URL (serverless asyncpg driver by default)
    database_url: str = Field(
        default="postgresql+asyncpg://postgres:postgres@localhost:5432/badminque",
        description="Async database connection string for Neon PostgreSQL",
    )

    # Operational environment
    environment: str = Field(
        default="development",
        description="Runtime environment: development, testing, or production",
    )

    # API route prefix
    api_prefix: str = Field(
        default="/api/v1",
        description="Global route prefix for API endpoints",
    )

    # CORS origins
    cors_origins: list[str] = Field(
        default_factory=lambda: [
            "http://localhost:3000",
            "http://127.0.0.1:3000",
        ],
        description="Allowed CORS origin domains",
    )

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )


settings = Settings()
