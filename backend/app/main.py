from collections.abc import AsyncGenerator
from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.openapi.docs import get_redoc_html, get_swagger_ui_html
from fastapi.responses import HTMLResponse, JSONResponse
from fastapi.staticfiles import StaticFiles
from loguru import logger

from app.api.v1.router import api_router
from app.core.config import settings
from app.core.i18n import get_locale, translate
from app.core.logging import configure_logging
from app.core.openapi_i18n import build_localized_openapi
from app.db.session import engine
from app.exceptions import register_exception_handlers
from app.middleware import LocaleMiddleware, RequestLoggingMiddleware


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncGenerator[None]:
    configure_logging()
    logger.info("Starting {} in {} mode", settings.APP_NAME, settings.ENVIRONMENT)
    yield
    logger.info("Shutting down {}", settings.APP_NAME)
    await engine.dispose()


# Must exist before StaticFiles(...) below is constructed (it checks the
# directory at construction time, which happens at import time — the
# lifespan's startup phase runs too late for that check).
Path(settings.UPLOAD_DIR).mkdir(parents=True, exist_ok=True)


app = FastAPI(
    title=settings.APP_NAME,
    description=translate("swagger.api_description"),
    debug=settings.DEBUG,
    lifespan=lifespan,
    # Swagger/ReDoc/OpenAPI schema are served by our own locale-aware routes
    # below instead of FastAPI's defaults, since app.openapi() is cached
    # once at startup and has no per-request context to pick a language.
    docs_url=None,
    redoc_url=None,
    openapi_url=None,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
app.add_middleware(RequestLoggingMiddleware)
app.add_middleware(LocaleMiddleware)

register_exception_handlers(app)

app.include_router(api_router, prefix=settings.API_V1_PREFIX)
app.mount("/media", StaticFiles(directory=settings.UPLOAD_DIR), name="media")


@app.get("/")
async def root() -> dict[str, str]:
    return {"service": settings.APP_NAME, "environment": settings.ENVIRONMENT}


@app.get("/openapi.json", include_in_schema=False)
async def openapi_json() -> JSONResponse:
    """Locale comes from LocaleMiddleware (already resolved from `?lang=`
    or Accept-Language by the time this runs), so this doesn't need its
    own query-param parsing."""
    locale = get_locale()
    schema = build_localized_openapi(app, locale, settings.API_V1_PREFIX)
    return JSONResponse(schema)


@app.get("/docs", include_in_schema=False)
async def swagger_docs() -> HTMLResponse:
    locale = get_locale()
    return get_swagger_ui_html(
        openapi_url=f"/openapi.json?lang={locale}",
        title=f"{translate('swagger.api_title', locale)} — Swagger UI",
    )


@app.get("/redoc", include_in_schema=False)
async def redoc_docs() -> HTMLResponse:
    locale = get_locale()
    return get_redoc_html(
        openapi_url=f"/openapi.json?lang={locale}",
        title=f"{translate('swagger.api_title', locale)} — ReDoc",
    )
