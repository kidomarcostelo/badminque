"""Tests for GET /health endpoint and error handlers."""

from unittest.mock import AsyncMock, patch

from fastapi.testclient import TestClient

from badminque_api.exceptions import EntityNotFoundError
from badminque_api.main import app
from badminque_api.schemas.health import DatabaseStatus


def test_health_endpoint_returns_healthy_and_connected(client: TestClient) -> None:
    """Acceptance criteria: GET /health returns {'status': 'healthy'} and DB status."""
    response = client.get("/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "healthy"
    assert data["database"] == "connected"
    assert "version" in data
    assert "environment" in data


def test_api_v1_health_alias(client: TestClient) -> None:
    """Verifies prefixed route /api/v1/health also responds cleanly."""
    response = client.get("/api/v1/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "healthy"
    assert data["database"] == "connected"


def test_health_reports_database_disconnected() -> None:
    """Verifies that DB disconnection is reported in health response."""
    with patch(
        "badminque_api.main.check_database_health",
        new=AsyncMock(return_value=DatabaseStatus.DISCONNECTED),
    ):
        with TestClient(app) as test_client:
            response = test_client.get("/health")
            assert response.status_code == 200
            data = response.json()
            assert data["status"] == "healthy"
            assert data["database"] == "disconnected"


def test_rfc7807_problem_details_handler() -> None:
    """Verifies domain errors return RFC 7807 Problem Details structure."""

    @app.get("/test-domain-error")
    async def trigger_domain_error() -> None:
        raise EntityNotFoundError("RosterPlayer", "non-existent-id")

    with TestClient(app) as test_client:
        response = test_client.get("/test-domain-error")
        assert response.status_code == 404
        data = response.json()
        assert data["title"] == "RosterPlayer Not Found"
        assert data["status"] == 404
        assert "non-existent-id" in data["detail"]
        assert data["type"] == "about:blank"
