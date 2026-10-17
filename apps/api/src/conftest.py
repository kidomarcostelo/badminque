"""Pytest configuration and fixtures for Badminque API tests."""

from collections.abc import Generator
from unittest.mock import AsyncMock, patch

import pytest
from fastapi.testclient import TestClient

from badminque_api.main import app
from badminque_api.schemas.health import DatabaseStatus


@pytest.fixture
def client() -> Generator[TestClient, None, None]:
    """Test client with default database connectivity mocked to CONNECTED."""
    with patch(
        "badminque_api.main.check_database_health",
        new=AsyncMock(return_value=DatabaseStatus.CONNECTED),
    ):
        with TestClient(app) as test_client:
            yield test_client
