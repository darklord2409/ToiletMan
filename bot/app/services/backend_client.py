from typing import Any

import httpx
from aiogram.types import User
from loguru import logger

from app.core.config import settings
from app.core.telegram_auth import build_signed_init_data

_TIMEOUT = 5.0


class BackendError(Exception):
    """Raised when the backend is unreachable or returns an error — every
    call site must decide for itself whether to degrade gracefully (most
    do) or let this propagate."""


async def login_with_telegram(user: User) -> dict[str, Any]:
    """Exchanges a freshly self-signed initData payload for a real
    customer JWT pair via the existing `/customer-auth/telegram` endpoint
    — see core/telegram_auth.py for why the bot can do this itself."""
    init_data = build_signed_init_data(settings.BOT_TOKEN, user)
    url = f"{settings.BACKEND_BASE_URL}/customer-auth/telegram"
    try:
        async with httpx.AsyncClient(timeout=_TIMEOUT) as client:
            response = await client.post(url, json={"init_data": init_data})
        response.raise_for_status()
        return response.json()
    except httpx.HTTPError as exc:
        logger.warning("Backend telegram login failed for user_id={}: {}", user.id, exc)
        raise BackendError(str(exc)) from exc


async def fetch_media_bytes(path: str) -> bytes | None:
    """Resolves a `logo_url`/`welcome_image_url` value to raw bytes.

    These are almost always relative `/media/...` paths (the admin's
    ImageUploadField only ever writes what the upload endpoint returns) —
    served from the backend's root, not under `/api/v1`, and reachable
    only on the internal docker network. Telegram's own servers can't
    fetch that URL themselves, so callers must download the bytes here
    and hand Telegram a BufferedInputFile instead of a raw URL string.
    Handles an absolute http(s) URL too, in case one is ever set by hand.
    """
    backend_root = settings.BACKEND_BASE_URL.removesuffix("/api/v1")
    url = path if path.startswith("http") else f"{backend_root}{path}"
    try:
        async with httpx.AsyncClient(timeout=_TIMEOUT) as client:
            response = await client.get(url)
        response.raise_for_status()
        return response.content
    except httpx.HTTPError as exc:
        logger.warning("Fetching media file {} failed: {}", path, exc)
        return None


async def get_public_settings() -> dict[str, Any]:
    """Public, unauthenticated — powers the welcome message, Support, and
    About Store text. Returns {} on any failure so the bot degrades to its
    own built-in locale strings instead of crashing."""
    url = f"{settings.BACKEND_BASE_URL}/settings/public"
    try:
        async with httpx.AsyncClient(timeout=_TIMEOUT) as client:
            response = await client.get(url)
        response.raise_for_status()
        return response.json()
    except httpx.HTTPError as exc:
        logger.warning("Fetching public store settings failed: {}", exc)
        return {}


async def get_me(access_token: str) -> dict[str, Any] | None:
    url = f"{settings.BACKEND_BASE_URL}/customer-auth/me"
    try:
        async with httpx.AsyncClient(timeout=_TIMEOUT) as client:
            response = await client.get(
                url, headers={"Authorization": f"Bearer {access_token}"}
            )
        response.raise_for_status()
        return response.json()
    except httpx.HTTPError as exc:
        logger.warning("Fetching customer profile failed: {}", exc)
        return None


async def update_profile(access_token: str, **fields: Any) -> dict[str, Any] | None:
    """Used for the notification-preference toggle (and, in principle,
    any other field on CustomerProfileUpdateRequest)."""
    url = f"{settings.BACKEND_BASE_URL}/customer-auth/me"
    try:
        async with httpx.AsyncClient(timeout=_TIMEOUT) as client:
            response = await client.patch(
                url, json=fields, headers={"Authorization": f"Bearer {access_token}"}
            )
        response.raise_for_status()
        return response.json()
    except httpx.HTTPError as exc:
        logger.warning("Updating customer profile failed: {}", exc)
        return None


async def update_language(access_token: str, language: str) -> dict[str, Any] | None:
    url = f"{settings.BACKEND_BASE_URL}/customer-auth/me/language"
    try:
        headers = {"Authorization": f"Bearer {access_token}"}
        async with httpx.AsyncClient(timeout=_TIMEOUT) as client:
            response = await client.patch(url, json={"language": language}, headers=headers)
        response.raise_for_status()
        return response.json()
    except httpx.HTTPError as exc:
        logger.warning("Updating customer language failed: {}", exc)
        return None
