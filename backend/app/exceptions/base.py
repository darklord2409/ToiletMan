from typing import Any

from fastapi import status

from app.core.i18n import translate


class AppError(Exception):
    """Base class for all application-raised errors. Caught by a single
    global handler and translated into a consistent, localized JSON error
    body based on the current request's locale.

    Callers can either pass a literal message (kept as-is, e.g. for
    messages already assembled dynamically) or an i18n `key` plus
    `params` to interpolate into the catalog entry at response time."""

    status_code: int = status.HTTP_500_INTERNAL_SERVER_ERROR

    def __init__(
        self,
        message: str | None = None,
        *,
        key: str | None = None,
        params: dict[str, Any] | None = None,
    ) -> None:
        self.key = key
        self.params = params or {}
        self.message = message or (translate(key, **self.params) if key else "Error")
        super().__init__(self.message)

    def localized_message(self) -> str:
        if self.key:
            return translate(self.key, **self.params)
        return self.message


class NotFoundError(AppError):
    status_code = status.HTTP_404_NOT_FOUND


class ConflictError(AppError):
    status_code = status.HTTP_409_CONFLICT


class BadRequestError(AppError):
    status_code = status.HTTP_400_BAD_REQUEST


class UnauthorizedError(AppError):
    status_code = status.HTTP_401_UNAUTHORIZED


class ForbiddenError(AppError):
    status_code = status.HTTP_403_FORBIDDEN


class TooManyRequestsError(AppError):
    status_code = status.HTTP_429_TOO_MANY_REQUESTS
