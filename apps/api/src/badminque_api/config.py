"""Application configuration and environment settings for Badminque API.

Uses Pydantic v2 Settings to validate configuration loaded from environment variables.
Handles Neon Serverless PostgreSQL URL normalization and Vercel CORS configuration.
"""

import json
from typing import Annotated, Any
from urllib.parse import parse_qsl, urlencode, urlparse, urlunparse

from pydantic import Field, field_validator
from pydantic_settings import BaseSettings, NoDecode, SettingsConfigDict


def normalize_database_url(database_url: str) -> tuple[str, dict[str, Any]]:
    """Normalize a database connection URL for SQLAlchemy + asyncpg.

    Neon connection strings typically look like:
        postgresql://user:pass@ep-xyz.region.aws.neon.tech/neondb?sslmode=require&channel_binding=require

    asyncpg requires the ``postgresql+asyncpg://`` scheme and rejects ``sslmode``
    and ``channel_binding`` query parameters, expecting
    ``connect_args={'ssl': 'require'}`` instead.
    """
    normalized = database_url.strip()
    if normalized.startswith("postgres://"):
        normalized = "postgresql+asyncpg://" + normalized[len("postgres://") :]
    elif normalized.startswith("postgresql://"):
        normalized = "postgresql+asyncpg://" + normalized[len("postgresql://") :]

    if not normalized.startswith("postgresql+asyncpg://"):
        return normalized, {}

    parsed = urlparse(normalized)
    query_items = parse_qsl(parsed.query, keep_blank_values=True)
    connect_args: dict[str, Any] = {}
    filtered_query: list[tuple[str, str]] = []

    for key, value in query_items:
        lower_key = key.lower()
        if lower_key == "sslmode":
            if value.lower() in {"require", "verify-ca", "verify-full"}:
                connect_args["ssl"] = "require"
            continue
        if lower_key == "channel_binding":
            continue
        filtered_query.append((key, value))

    sanitized_url = urlunparse(parsed._replace(query=urlencode(filtered_query)))
    return sanitized_url, connect_args


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

    # CORS origins (accepts comma-separated string or JSON/Python list)
    cors_origins: Annotated[list[str], NoDecode] = Field(
        default_factory=lambda: [
            "http://localhost:3000",
            "http://127.0.0.1:3000",
        ],
        description="Allowed CORS origin domains",
    )

    # Optional regex for dynamic preview deployments (e.g. Vercel previews)
    cors_origin_regex: str | None = Field(
        default=r"https://.*\.vercel\.app",
        description="Regex matching allowed CORS origin domains (e.g. Vercel previews)",
    )

    @field_validator("cors_origins", mode="before")
    @classmethod
    def parse_cors_origins(cls, value: Any) -> list[str]:
        """Accept comma-separated strings or JSON lists for CORS_ORIGINS."""
        if isinstance(value, str):
            trimmed = value.strip()
            if not trimmed:
                return []
            if trimmed.startswith("["):
                parsed = json.loads(trimmed)
                return [str(item).strip() for item in parsed if str(item).strip()]
            return [origin.strip() for origin in trimmed.split(",") if origin.strip()]
        if isinstance(value, (list, tuple, set)):
            return [str(item).strip() for item in value if str(item).strip()]
        raise ValueError("cors_origins must be a list or comma-separated string")

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )


settings = Settings()
