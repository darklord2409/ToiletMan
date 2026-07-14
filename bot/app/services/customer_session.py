from aiogram.types import User
from redis.asyncio import Redis

from app.services import backend_client

_TOKEN_KEY_PREFIX = "bot:customer_token:"
# Refresh a bit before the backend's own access-token expiry so a request
# never lands right as the cached token lapses.
_EXPIRY_SAFETY_MARGIN_SECONDS = 60


async def get_customer_access_token(redis: Redis, user: User) -> str | None:
    """Returns a valid customer JWT for this Telegram user, transparently
    logging in (and caching the result) on first use or once the cached
    token's TTL has lapsed — see core/telegram_auth.py for how the bot
    signs its own initData to reuse /customer-auth/telegram.

    Returns None if the backend is unreachable; callers must treat that as
    "customer-specific features unavailable right now", not a fatal error
    — the shop button itself needs no token at all, since the Mini App
    does its own Telegram-initData handshake independently."""
    cache_key = f"{_TOKEN_KEY_PREFIX}{user.id}"
    cached = await redis.get(cache_key)
    if cached:
        return cached

    try:
        tokens = await backend_client.login_with_telegram(user)
    except backend_client.BackendError:
        return None

    access_token = tokens.get("access_token")
    expires_in = tokens.get("expires_in", 0)
    if not access_token:
        return None

    ttl = max(int(expires_in) - _EXPIRY_SAFETY_MARGIN_SECONDS, 30)
    await redis.set(cache_key, access_token, ex=ttl)
    return access_token
