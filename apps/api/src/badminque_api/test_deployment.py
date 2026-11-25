"""Tests for zero-cost cloud deployment configuration (Neon, Koyeb, Vercel)."""

import json
from pathlib import Path

from fastapi.testclient import TestClient

from badminque_api.config import Settings, normalize_database_url
from badminque_api.main import app

REPO_ROOT = Path(__file__).resolve().parents[4]


def test_normalize_neon_postgres_url_upgrades_driver_and_ssl() -> None:
    """Neon connection strings are upgraded to asyncpg with ssl connect_args."""
    neon_url = (
        "postgresql://neondb_owner:secret@ep-quiet-hall-123.us-east-2.aws.neon.tech"
        "/neondb?sslmode=require&channel_binding=require"
    )
    normalized_url, connect_args = normalize_database_url(neon_url)

    assert normalized_url == (
        "postgresql+asyncpg://neondb_owner:secret@"
        "ep-quiet-hall-123.us-east-2.aws.neon.tech/neondb"
    )
    assert "sslmode" not in normalized_url
    assert "channel_binding" not in normalized_url
    assert connect_args == {"ssl": "require"}


def test_normalize_postgres_scheme_alias_and_sqlite_passthrough() -> None:
    """Short postgres:// alias upgrades while sqlite URLs pass through unchanged."""
    url, connect_args = normalize_database_url("postgres://u:p@host:5432/db")
    assert url == "postgresql+asyncpg://u:p@host:5432/db"
    assert connect_args == {}

    sqlite_url, sqlite_args = normalize_database_url("sqlite+aiosqlite:///:memory:")
    assert sqlite_url == "sqlite+aiosqlite:///:memory:"
    assert sqlite_args == {}


def test_settings_parses_comma_separated_cors_origins() -> None:
    """Comma-separated CORS_ORIGINS env var parses cleanly for Koyeb config."""
    cfg = Settings.model_validate(
        {"cors_origins": "https://badminque.vercel.app, http://localhost:3000"}
    )
    assert cfg.cors_origins == [
        "https://badminque.vercel.app",
        "http://localhost:3000",
    ]


def test_cors_allows_vercel_preview_deployments() -> None:
    """FastAPI CORS middleware allows Vercel preview URLs via regex."""
    with TestClient(app) as client:
        response = client.options(
            "/api/v1/sync/batch",
            headers={
                "Origin": "https://badminque-git-feat-ui-demo.vercel.app",
                "Access-Control-Request-Method": "POST",
            },
        )
        assert response.status_code == 200
        assert (
            response.headers.get("access-control-allow-origin")
            == "https://badminque-git-feat-ui-demo.vercel.app"
        )


def test_deployment_artifacts_exist_and_are_valid() -> None:
    """Verifies Koyeb Dockerfile, startup script, Vercel config, and env templates."""
    dockerfile = REPO_ROOT / "apps" / "api" / "Dockerfile"
    start_sh = REPO_ROOT / "apps" / "api" / "start.sh"
    vercel_json = REPO_ROOT / "vercel.json"
    api_env = REPO_ROOT / "apps" / "api" / ".env.example"
    web_env = REPO_ROOT / "apps" / "web" / ".env.example"

    assert dockerfile.exists()
    dockerfile_text = dockerfile.read_text(encoding="utf-8")
    assert "uvicorn" in dockerfile_text or "start.sh" in dockerfile_text
    assert "HEALTHCHECK" in dockerfile_text

    assert start_sh.exists()
    start_text = start_sh.read_text(encoding="utf-8")
    assert "alembic upgrade head" in start_text
    assert "uvicorn badminque_api.main:app" in start_text

    assert vercel_json.exists()
    vercel_data = json.loads(vercel_json.read_text(encoding="utf-8"))
    assert vercel_data["framework"] == "nextjs"
    assert vercel_data["outputDirectory"] == "apps/web/.next"

    assert api_env.exists()
    assert web_env.exists()
