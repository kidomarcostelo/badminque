"""Database engine, async session factory, and connectivity health check.

Conforms to ADR 0001 (Neon Serverless PostgreSQL) and CODING_STANDARDS.md.
"""

import logging
from collections.abc import AsyncGenerator
from typing import Annotated

from fastapi import Depends
from sqlalchemy import text
from sqlalchemy.ext.asyncio import (
    AsyncSession,
    async_sessionmaker,
    create_async_engine,
)

from badminque_api.config import settings
from badminque_api.schemas.health import DatabaseStatus

logger = logging.getLogger(__name__)

# Engine configuration - Neon serverless Postgres asyncpg
engine = create_async_engine(
    settings.database_url,
    echo=(settings.environment == "development"),
    pool_pre_ping=True,
    pool_size=5,
    max_overflow=10,
)

async_session_maker = async_sessionmaker(
    bind=engine,
    class_=AsyncSession,
    expire_on_commit=False,
    autocommit=False,
    autoflush=False,
)


async def get_db_session() -> AsyncGenerator[AsyncSession, None]:
    """Dependency provider for transactional async database sessions."""
    async with async_session_maker() as session:
        try:
            yield session
        except Exception:
            await session.rollback()
            raise


# Type alias for dependency injection per CODING_STANDARDS.md Section 3.2
DbSession = Annotated[AsyncSession, Depends(get_db_session)]


async def check_database_health() -> DatabaseStatus:
    """Verifies live database connectivity via a lightweight ping."""
    if not settings.database_url:
        return DatabaseStatus.UNCONFIGURED

    try:
        async with engine.connect() as conn:
            await conn.execute(text("SELECT 1"))
            return DatabaseStatus.CONNECTED
    except Exception as exc:
        logger.warning("Database connectivity check failed: %s", exc)
        return DatabaseStatus.DISCONNECTED
