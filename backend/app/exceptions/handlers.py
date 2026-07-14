from fastapi import FastAPI, Request, status
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from loguru import logger
from sqlalchemy.exc import IntegrityError

from app.core.i18n import translate
from app.core.pydantic_i18n import translate_pydantic_errors
from app.exceptions.base import AppError

# Starlette's add_exception_handler is typed to accept only
# Callable[[Request, Exception], ...] — narrower handler signatures below
# are safe at runtime (Starlette only ever calls a handler with an
# instance of the exc_class it was registered for) but not something
# plain function typing can express, hence the Exception param + assert
# (which also gives mypy back the narrowed type for the handler body).


async def app_error_handler(request: Request, exc: Exception) -> JSONResponse:
    assert isinstance(exc, AppError)
    detail = exc.localized_message()
    logger.warning("{} {} -> {} {}", request.method, request.url.path, exc.status_code, detail)
    return JSONResponse(status_code=exc.status_code, content={"detail": detail})


async def validation_error_handler(request: Request, exc: Exception) -> JSONResponse:
    assert isinstance(exc, RequestValidationError)
    logger.warning("{} {} -> 422 validation error", request.method, request.url.path)
    translated_errors = translate_pydantic_errors(exc.errors())
    return JSONResponse(
        status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
        content={"detail": translate("errors.validation_error"), "errors": translated_errors},
    )


async def integrity_error_handler(request: Request, exc: Exception) -> JSONResponse:
    assert isinstance(exc, IntegrityError)
    logger.error("{} {} -> integrity error: {}", request.method, request.url.path, exc.orig)
    return JSONResponse(
        status_code=status.HTTP_409_CONFLICT,
        content={"detail": translate("errors.conflict")},
    )


async def unhandled_exception_handler(request: Request, exc: Exception) -> JSONResponse:
    logger.exception("{} {} -> unhandled exception", request.method, request.url.path)
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content={"detail": translate("errors.internal_error")},
    )


def register_exception_handlers(app: FastAPI) -> None:
    app.add_exception_handler(AppError, app_error_handler)
    app.add_exception_handler(RequestValidationError, validation_error_handler)
    app.add_exception_handler(IntegrityError, integrity_error_handler)
    app.add_exception_handler(Exception, unhandled_exception_handler)
