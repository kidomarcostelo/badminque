"""FastAPI application entry point for Badminque API.

Conforms to ADR 0001, GLOSSARY.md, and CODING_STANDARDS.md.
"""

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from badminque_api.config import settings
from badminque_api.database import check_database_health
from badminque_api.exceptions import BadminqueError
from badminque_api.schemas.health import HealthResponse

app = FastAPI(
    title="Badminque API",
    description=(
        "Universal badminton skill transparency rating and match "
        "synchronization backend."
    ),
    version="0.1.0",
)

# CORS middleware for Next.js PWA client
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.exception_handler(BadminqueError)
async def handle_badminque_domain_error(
    request: Request, exc: BadminqueError
) -> JSONResponse:
    """RFC 7807 Problem Details centralized domain exception handler."""
    problem_details = {
        "type": "about:blank",
        "title": exc.title,
        "status": exc.status_code,
        "detail": exc.detail,
        "instance": str(request.url.path),
        **exc.extra,
    }
    return JSONResponse(
        status_code=exc.status_code,
        content=problem_details,
    )


@app.get("/health", response_model=HealthResponse, tags=["Health"])
@app.get(
    f"{settings.api_prefix}/health",
    response_model=HealthResponse,
    tags=["Health"],
)
async def health_check() -> HealthResponse:
    """Health check endpoint reporting application and database connectivity status."""
    db_status = await check_database_health()
    return HealthResponse(
        status="healthy",
        database=db_status,
        environment=settings.environment,
        version="0.1.0",
    )
