"""Domain exception hierarchy for Badminque.

Strictly follows CODING_STANDARDS.md Section 3.4.
All domain exceptions inherit from BadminqueError and map to RFC 7807 Problem Details.
"""

from typing import Any


class BadminqueError(Exception):
    """Base exception for all domain errors within Badminque."""

    def __init__(
        self,
        detail: str,
        title: str = "Badminque Domain Error",
        status_code: int = 500,
        extra: dict[str, Any] | None = None,
    ) -> None:
        super().__init__(detail)
        self.detail = detail
        self.title = title
        self.status_code = status_code
        self.extra = extra or {}


class EntityNotFoundError(BadminqueError):
    """Raised when a requested domain entity cannot be found."""

    def __init__(self, entity_name: str, identifier: str) -> None:
        super().__init__(
            detail=f"{entity_name} with identifier '{identifier}' was not found.",
            title=f"{entity_name} Not Found",
            status_code=404,
            extra={"entity": entity_name, "identifier": identifier},
        )


class DomainValidationError(BadminqueError):
    """Raised when input violates domain business invariants."""

    def __init__(self, detail: str, extra: dict[str, Any] | None = None) -> None:
        super().__init__(
            detail=detail,
            title="Domain Validation Error",
            status_code=422,
            extra=extra,
        )


class SyncConflictError(BadminqueError):
    """Raised when an offline batch sync encounters an unresolvable state."""

    def __init__(self, detail: str, extra: dict[str, Any] | None = None) -> None:
        super().__init__(
            detail=detail,
            title="Sync Conflict Error",
            status_code=409,
            extra=extra,
        )


class DatabaseConnectionError(BadminqueError):
    """Raised when the database connection cannot be established or verified."""

    def __init__(self, detail: str = "Unable to connect to database.") -> None:
        super().__init__(
            detail=detail,
            title="Database Connection Failure",
            status_code=503,
        )
